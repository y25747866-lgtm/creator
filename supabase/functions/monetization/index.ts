import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getUserId(req: Request): string | null {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const token = auth.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

function getSupabase(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const SYSTEM_PROMPT = `You are a world-class business strategist, conversion copywriter, and product architect.

You create products that:
- Feel human, emotional, and real
- Solve actual problems
- Are structured, actionable, and monetizable
- Read like premium content, not AI output
- Could be sold immediately without editing

You write with:
- Clarity
- Authority
- Emotional intelligence
- Practical depth
- Strategic thinking

You never summarize.
You never output vague advice.
You always produce full, complete, structured content.

Every output must feel like:
"This could be sold today for money."`;

const MODULE_INSTRUCTIONS: Record<string, string> = {
  course: `Create a fully monetizable Online Course from the following product.

Requirements:
- Course title and promise
- Learning outcomes (5-8)
- Full module structure (5-8 modules)
- Each module: 3-5 lesson titles with summaries
- Scripts or bullet lesson content for each lesson
- Homework/exercises per module
- Completion transformation statement
- Format as detailed markdown with clear headings`,

  lead_magnet: `Create a fully monetizable Lead Magnet from the following product.

Requirements:
- Lead magnet title
- Hook headline
- Problem framing paragraph
- Value promise
- 5-10 page structured content (write in full)
- CTA section
- Landing page copy for opt-in
- Thank-you page copy
- Format as detailed markdown`,

  prompt_pack: `Create a fully monetizable Prompt Pack from the following product.

Requirements:
- Prompt pack title and niche positioning
- 20-30 high-quality prompts
- Categorized by use case (4-6 categories)
- Clear instructions for each prompt
- Use examples for at least 5 prompts
- Monetization positioning section
- Format as detailed markdown`,

  landing_page: `Create fully monetizable Landing Page Copy from the following product.

Requirements:
- Hero section: headline, subheadline, CTA
- Pain-to-solution framing section
- Benefits bullets (8-10)
- Social proof placeholders with copy
- Offer breakdown section
- Pricing section copy
- CTA section
- FAQ section (5-8 questions)
- Format as detailed markdown`,

  email_sequence: `Create a fully monetizable Email Sequence from the following product.

Requirements:
- Welcome sequence (3-5 emails with subject lines and full body)
- Nurture sequence (3-5 emails with subject lines and full body)
- Sales sequence (3-5 emails with subject lines and full body)
- Re-engagement email
- Each email: subject line, preview text, full body copy, CTA
- Format as detailed markdown`,

  affiliate_funnel: `Create a fully monetizable Affiliate Funnel from the following product.

Requirements:
- Traffic source suggestions (5-8)
- Lead magnet mapping
- Funnel steps (5-7 steps detailed)
- Page-by-page copy for each funnel step
- Offer angles (3-5)
- Monetization logic
- Retargeting flow description
- Format as detailed markdown`,

  upsell_offer: `Create a fully monetizable Upsell/Downsell Offer from the following product.

Requirements:
- Upsell product idea and name
- Offer positioning and unique angle
- Pricing psychology explanation
- Full upsell page copy
- Downsell alternative offer
- Funnel placement logic
- Format as detailed markdown`,

  micro_saas_blueprint: `Create a fully monetizable Micro SaaS Blueprint from the following product.

Requirements:
- SaaS concept and name
- Core problem it solves
- Target user persona
- MVP feature list (10-15 features)
- Monetization model (pricing tiers)
- User flows (3-5 key flows)
- Growth strategy (5-8 tactics)
- Tech stack suggestion
- Launch roadmap (90-day plan)
- Format as detailed markdown`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const userId = getUserId(req);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = getSupabase(req);

    // CREATE PRODUCT
    if (action === "create-product" && req.method === "POST") {
      const { title, topic, description, sourceType, sourceProductId } = await req.json();
      const { data, error } = await sb
        .from("monetization_products")
        .insert({
          user_id: userId,
          title,
          topic,
          description: description || null,
          source_type: sourceType || "ebook",
          source_product_id: sourceProductId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ product: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE MODULE
    if (action === "create-module" && req.method === "POST") {
      const { productId, moduleType, title } = await req.json();
      // Verify ownership
      const { data: prod } = await sb
        .from("monetization_products")
        .select("id")
        .eq("id", productId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!prod) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await sb
        .from("monetization_modules")
        .insert({ product_id: productId, module_type: moduleType, title, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ module: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GENERATE MODULE CONTENT
    if (action === "generate-module" && req.method === "POST") {
      const { moduleId, moduleType, title, topic, description, sourceContent } = await req.json();

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const instruction = MODULE_INSTRUCTIONS[moduleType] || MODULE_INSTRUCTIONS["course"];
      const userPrompt = `${instruction}

Title: "${title}"
Topic: "${topic}"
Description: "${description || "N/A"}"

Source Content:
${(sourceContent || "").substring(0, 12000)}

Requirements:
- Output must be complete, professional, and production-ready
- Use emotional language and real-world framing
- Include clear structure, sections, and deliverables
- Do NOT summarize — write everything in full
- Format clearly using markdown headings and lists
- Assume this will be sold to real customers

Begin now.`;

      const model = "google/gemini-3-flash-preview";

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        const text = await aiRes.text();
        console.error("AI gateway error:", status, text);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI generation failed");
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      if (!content || content.length < 200) {
        throw new Error("Generated content too short. Please retry.");
      }

      // Get current max version
      const { data: versions } = await sb
        .from("monetization_versions")
        .select("version_number")
        .eq("module_id", moduleId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      const { data: version, error: vErr } = await sb
        .from("monetization_versions")
        .insert({
          module_id: moduleId,
          content: { markdown: content },
          prompt_used: userPrompt.substring(0, 2000),
          model_used: model,
          version_number: nextVersion,
        })
        .select()
        .single();
      if (vErr) throw vErr;

      // Update module status
      await sb
        .from("monetization_modules")
        .update({ status: "generated" })
        .eq("id", moduleId);

      return new Response(
        JSON.stringify({ version, content, moduleId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // LIST PRODUCTS
    if (action === "list-products" && req.method === "GET") {
      const { data, error } = await sb
        .from("monetization_products")
        .select("*, monetization_modules(id, module_type, title, status, created_at)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ products: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST MODULES
    if (action === "list-modules" && req.method === "GET") {
      const productId = url.searchParams.get("productId");
      const { data, error } = await sb
        .from("monetization_modules")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ modules: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET MODULE WITH LATEST VERSION
    if (action === "get-module" && req.method === "GET") {
      const moduleId = url.searchParams.get("moduleId");
      const { data: mod } = await sb
        .from("monetization_modules")
        .select("*")
        .eq("id", moduleId)
        .maybeSingle();
      const { data: versions } = await sb
        .from("monetization_versions")
        .select("*")
        .eq("module_id", moduleId)
        .order("version_number", { ascending: false });
      return new Response(
        JSON.stringify({ module: mod, versions: versions || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // RECORD METRIC
    if (action === "record-metric" && req.method === "POST") {
      const { moduleId, eventType, metadata } = await req.json();
      const { error } = await sb
        .from("monetization_metrics")
        .insert({ module_id: moduleId, event_type: eventType, metadata: metadata || null });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SUBMIT FEEDBACK
    if (action === "submit-feedback" && req.method === "POST") {
      const { moduleId, rating, comment, section } = await req.json();
      const { error } = await sb
        .from("monetization_feedback")
        .insert({
          module_id: moduleId,
          user_id: userId,
          rating: rating || null,
          comment: comment || null,
          section: section || null,
        });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Monetization error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
