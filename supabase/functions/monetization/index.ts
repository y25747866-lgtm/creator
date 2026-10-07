import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAccess, errorResponse, corsHeaders, checkRateLimit, validateAndSanitize } from "../_shared/validation.ts";

const PAGE_SIZE = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCursor(raw: string | null): { created_at: string; id: string } | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.created_at === "string" && Number.isFinite(Date.parse(value.created_at)) && typeof value?.id === "string" && UUID_PATTERN.test(value.id)) {
      return { created_at: value.created_at, id: value.id };
    }
  } catch { /* malformed cursor */ }
  return null;
}

function cursorFilter(cursor: { created_at: string; id: string }) {
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}

function pageRows(rows: Record<string, unknown>[]) {
  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? { created_at: last.created_at as string, id: last.id as string } : null };
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const SYSTEM_PROMPT = `
You are a world-class monetization strategist.
Generate fully sellable digital product content.
No fluff. Full markdown. Professional.
`;

serve(async (req) => {

  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const access = await verifyAccess(req);
    if (!access.authorized || !access.userId) {
      return errorResponse(access.error || 'Subscription required', 403);
    }

    const sb = getSupabase();
    
    // Rate limiting
    const rateLimit = await checkRateLimit(sb, access.userId);
    if (!rateLimit.allowed) {
      return errorResponse(rateLimit.error!, 429);
    }

    const userId = access.userId;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    //////////////////////////////////////////////////////
    // CREATE PRODUCT
    //////////////////////////////////////////////////////
    if (action === "create-product" && req.method === "POST") {

      const body = await req.json();
      
      // Input validation & sanitization
      const title = validateAndSanitize(body.title, 100);
      const topic = validateAndSanitize(body.topic, 500);
      const description = body.description ? validateAndSanitize(body.description, 1000) : null;
      const sourceType = body.sourceType ? validateAndSanitize(body.sourceType, 100) : "ebook";
      const sourceProductId = body.sourceProductId ? validateAndSanitize(body.sourceProductId, 100) : null;

      const { data, error } = await sb
        .from("monetization_products")
        .insert({
          user_id: userId,
          title,
          topic,
          description,
          source_type: sourceType,
          source_product_id: sourceProductId
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          product: data
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    //////////////////////////////////////////////////////
    // CREATE MODULE (FIXED)
    //////////////////////////////////////////////////////
    if (action === "create-module" && req.method === "POST") {

      const body = await req.json();

      const productId = validateAndSanitize(body.productId, 100);
      const moduleType = validateAndSanitize(body.moduleType, 100);
      const title = validateAndSanitize(body.title, 100);

      const { data: product } = await sb
        .from("monetization_products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

      if (!product)
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      const { data, error } = await sb
        .from("monetization_modules")
        .insert({
          product_id: productId,
          module_type: moduleType,
          title,
          status: "draft"
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          module: data
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    //////////////////////////////////////////////////////
    // GENERATE MODULE CONTENT (GROQ)
    //////////////////////////////////////////////////////
    if (action === "generate-module" && req.method === "POST") {

      const body = await req.json();
      
      // Input validation & sanitization
      const title = validateAndSanitize(body.title, 100);
      const topic = validateAndSanitize(body.topic, 500);
      const sourceContent = body.sourceContent ? validateAndSanitize(body.sourceContent, 10000) : "";
      const moduleId = validateAndSanitize(body.moduleId, 100);

      const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

      if (!GROQ_KEY)
        throw new Error("Missing GROQ_API_KEY");

      const prompt = `
	Create monetizable product content.
	
	TITLE: ${title}
	TOPIC: ${topic}
	
	${sourceContent}
	`;

      const aiRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000
          }),
        }
      );

      if (!aiRes.ok)
        throw new Error("AI failed");

      const ai = await aiRes.json();

      const content =
        ai.choices?.[0]?.message?.content || "";

      if (!content)
        throw new Error("Empty content");

      //////////////////////////////////////////////////////
      // SAVE VERSION
      //////////////////////////////////////////////////////

      const { data: last } = await sb
        .from("monetization_versions")
        .select("version_number")
        .eq("module_id", body.moduleId)
        .order("version_number", { ascending: false })
        .limit(1);

      const versionNumber =
        (last?.[0]?.version_number || 0) + 1;

      const { data: version } = await sb
        .from("monetization_versions")
        .insert({
          module_id: body.moduleId,
          content: { markdown: content },
          model_used: "llama-3.3-70b-versatile",
          version_number: versionNumber
        })
        .select()
        .single();

      await sb
        .from("monetization_modules")
        .update({ status: "generated" })
        .eq("id", body.moduleId);

      return new Response(
        JSON.stringify({
          success: true,
          content,
          version
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    //////////////////////////////////////////////////////
    // LIST PRODUCTS
    //////////////////////////////////////////////////////
    if (action === "list-products") {
      const paged = url.searchParams.get("paged") === "true";
      const cursor = paged ? parseCursor(url.searchParams.get("cursor")) : null;
      let query = sb
        .from("monetization_products")
        .select(`
          *,
          monetization_modules(*)
        `)
        .eq("user_id", userId);
      if (cursor) query = query.or(cursorFilter(cursor));
      query = query.order("created_at", { ascending: false });
      if (paged) query = query.order("id", { ascending: false }).limit(PAGE_SIZE + 1);
      const { data, error } = await query;
      if (error) throw error;

      const result = paged ? pageRows(data || []) : { items: data || [], hasMore: false, nextCursor: null };

      return new Response(
        JSON.stringify({
          products: result.items,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-module" && req.method === "GET") {
      const moduleId = url.searchParams.get("moduleId");
      if (!moduleId) return errorResponse("moduleId required", 400);

      const { data: module, error: moduleError } = await sb
        .from("monetization_modules")
        .select("id, product_id, monetization_products!inner(user_id)")
        .eq("id", moduleId)
        .eq("monetization_products.user_id", userId)
        .maybeSingle();
      if (moduleError) throw moduleError;
      if (!module) return errorResponse("Asset not found", 404);

      const cursor = parseCursor(url.searchParams.get("cursor"));
      let query = sb.from("monetization_versions").select("*").eq("module_id", moduleId);
      if (cursor) query = query.or(cursorFilter(cursor));
      const { data: versions, error } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (error) throw error;
      const page = pageRows(versions || []);
      return new Response(JSON.stringify({ versions: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorResponse("Unknown action", 400);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(msg, 500);
  }

});
