import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type",
};

function getUserId(req: Request): string | null {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const token = auth.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    return null;
  }
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const userId = getUserId(req);

    if (!userId)
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );

    const sb = getSupabase();

    //////////////////////////////////////////////////////
    // CREATE PRODUCT
    //////////////////////////////////////////////////////
    if (action === "create-product" && req.method === "POST") {

      const body = await req.json();

      const { data, error } = await sb
        .from("monetization_products")
        .insert({
          user_id: userId,
          title: body.title,
          topic: body.topic,
          description: body.description ?? null,
          source_type: body.sourceType ?? "ebook",
          source_product_id: body.sourceProductId ?? null
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          product: data
        }),
        { headers: corsHeaders }
      );
    }

    //////////////////////////////////////////////////////
    // CREATE MODULE (FIXED)
    //////////////////////////////////////////////////////
    if (action === "create-module" && req.method === "POST") {

      const body = await req.json();

      const productId = body.productId;

      const { data: product } = await sb
        .from("monetization_products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

      if (!product)
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: corsHeaders }
        );

      const { data, error } = await sb
        .from("monetization_modules")
        .insert({
          product_id: productId,
          module_type: body.moduleType,
          title: body.title,
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
        { headers: corsHeaders }
      );
    }

    //////////////////////////////////////////////////////
    // GENERATE MODULE CONTENT (GROQ)
    //////////////////////////////////////////////////////
    if (action === "generate-module" && req.method === "POST") {

      const body = await req.json();

      const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

      if (!GROQ_KEY)
        throw new Error("Missing GROQ_API_KEY");

      const prompt = `
Create monetizable product content.

TITLE: ${body.title}
TOPIC: ${body.topic}

${body.sourceContent || ""}
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
        { headers: corsHeaders }
      );
    }

    //////////////////////////////////////////////////////
    // LIST PRODUCTS
    //////////////////////////////////////////////////////
    if (action === "list-products") {

      const { data } = await sb
        .from("monetization_products")
        .select(`
          *,
          monetization_modules(*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({
          products: data
        }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: corsHeaders }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: msg
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }

});
