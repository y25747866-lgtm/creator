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

const SYSTEM_PROMPT = `You are the Modular Monetization Engine — a world-class business strategist, conversion copywriter, and product architect.

Your job is to transform a source product into monetizable digital assets that maximize revenue, conversion, and scalability.

CORE OBJECTIVES:
1. Generate high-conversion monetization assets
2. Ensure each asset is standalone and sellable
3. Optimize for speed-to-market
4. Output structured, dashboard-ready content
5. Prioritize business results over fluff

You create products that:
- Feel human, emotional, and real
- Solve actual problems with practical depth
- Are structured, actionable, and immediately monetizable
- Read like premium content created by a human expert, not AI output
- Could be sold immediately without editing

You write with:
- Clarity and authority
- Emotional intelligence
- Strategic, founder-level thinking
- Execution-oriented precision

CONVERSION RULES:
- No fluff or motivational filler
- No generic advice or vague business talk
- No placeholders like "Insert here"
- No outlines-only or partial outputs
- Everything must be deployable immediately

VOICE: Confident. Direct. Strategic. Execution-oriented.

You never summarize. You never output vague advice. You always produce full, complete, structured content.

Every output must feel like: "This could be sold today for money."

MONETIZATION OPTIMIZATION — For every module you generate:
- Suggest pricing tiers where relevant
- Include upsell paths and cross-sell opportunities
- Consider bundle logic and long-term monetization strategy`;

const MODULE_INSTRUCTIONS: Record<string, string> = {
  course: `Create a fully monetizable Online Course.

OUTPUT STRUCTURE:
MODULE TYPE: Course
TITLE: [Course title]
TARGET USER: [Specific persona]
DELIVERY FORMAT: Online course platform

Generate:
- Course title and bold promise statement
- Learning outcomes (5-8, specific and measurable)
- Full module structure (5-8 modules)
- Each module: 3-5 lesson titles with detailed summaries
- Scripts or bullet lesson content for each lesson
- Homework/exercises per module with clear deliverables
- Completion transformation statement
- Pricing suggestion (3 tiers)
- Upsell path recommendation
- CTA for enrollment

Format as detailed markdown with clear headings.`,

  lead_magnet: `Create a fully monetizable Lead Magnet.

OUTPUT STRUCTURE:
MODULE TYPE: Lead Magnet
TITLE: [Lead magnet title]
TARGET USER: [Specific persona]
DELIVERY FORMAT: PDF / Digital download

Generate:
- Lead magnet title with hook headline
- Problem framing paragraph (emotionally compelling)
- Value promise statement
- 5-10 pages of structured content (write in FULL, not outlines)
- Actionable frameworks, checklists, or templates within
- CTA section driving to paid offer
- Landing page copy for opt-in (headline, subheadline, bullets, CTA)
- Thank-you page copy with next-step nudge
- Email follow-up suggestion

Format as detailed markdown.`,

  prompt_pack: `Create a fully monetizable Prompt Pack.

OUTPUT STRUCTURE:
MODULE TYPE: Prompt Pack
TITLE: [Prompt pack title]
TARGET USER: [Specific persona]
DELIVERY FORMAT: Digital download / Notion template

Generate:
- Prompt pack title and niche positioning
- 20-30 high-quality, specific prompts (not generic)
- Categorized by use case (4-6 categories)
- Clear instructions for each prompt with context
- Use examples for at least 8 prompts showing input→output
- Advanced tips section for power users
- Monetization positioning (pricing, bundling, platform suggestions)
- CTA for related products

Format as detailed markdown.`,

  landing_page: `Create fully monetizable Landing Page Copy.

OUTPUT STRUCTURE:
MODULE TYPE: Landing Page
TITLE: [Product/offer name]
TARGET USER: [Specific persona]
DELIVERY FORMAT: Web page copy

Generate:
- Hero section: power headline, subheadline, primary CTA
- Pain-to-solution framing section (emotional, specific)
- Benefits bullets (8-10, outcome-focused)
- Feature breakdown with benefit framing
- Social proof section (testimonial templates with copy)
- Offer breakdown section (what they get, value stacking)
- Pricing section copy with anchor pricing psychology
- Risk reversal / guarantee section
- CTA section with urgency
- FAQ section (6-8 questions with objection-handling answers)
- Above-fold and below-fold structure notes

Format as detailed markdown.`,

  email_sequence: `Create a fully monetizable Email Sequence.

OUTPUT STRUCTURE:
MODULE TYPE: Email Sequence
TITLE: [Sequence name]
TARGET USER: [Specific persona]
DELIVERY FORMAT: Email marketing platform

Generate:
- Welcome sequence (4 emails): subject lines, preview text, full body copy, CTA per email
- Nurture sequence (4 emails): value-driven, story-based, building trust
- Sales sequence (5 emails): urgency, proof, objection handling, scarcity
- Re-engagement email: win-back angle
- Each email must include: subject line, preview text, complete body copy, specific CTA
- Timing recommendations between emails
- Segmentation suggestions
- A/B test subject line alternatives for key emails

Format as detailed markdown.`,

  affiliate_funnel: `Create a fully monetizable Affiliate Funnel.

OUTPUT STRUCTURE:
MODULE TYPE: Affiliate Funnel
TITLE: [Funnel name]
TARGET USER: [Specific affiliate/partner persona]
DELIVERY FORMAT: Funnel system documentation

Generate:
- Traffic source strategies (5-8 specific channels with tactics)
- Lead magnet mapping (what freebie captures the right audience)
- Funnel steps (5-7 steps with detailed flow)
- Page-by-page copy for each funnel step (full copy, not outlines)
- Offer angles (3-5 unique positioning angles)
- Commission structure and monetization logic
- Retargeting flow with ad copy suggestions
- Conversion optimization checklist
- KPI targets per funnel stage

Format as detailed markdown.`,

  upsell_offer: `Create a fully monetizable Upsell/Downsell Offer.

OUTPUT STRUCTURE:
MODULE TYPE: Upsell / Downsell
TITLE: [Offer name]
TARGET USER: [Buyer persona post-purchase]
DELIVERY FORMAT: Checkout flow / Post-purchase page

Generate:
- Upsell product idea, name, and unique value proposition
- Offer positioning and differentiation from core product
- Pricing psychology (anchoring, contrast, value framing)
- Full upsell page copy (headline, body, proof, CTA)
- Downsell alternative offer (lower price, different angle)
- Downsell page copy
- Funnel placement logic (when and where to show)
- Revenue projection model
- Bundle suggestions for maximum AOV

Format as detailed markdown.`,

  micro_saas_blueprint: `Create a fully monetizable Micro SaaS Blueprint.

OUTPUT STRUCTURE:
MODULE TYPE: Micro SaaS Blueprint
TITLE: [SaaS concept name]
TARGET USER: [Specific user persona]
DELIVERY FORMAT: Strategic blueprint document

Generate:
- SaaS concept name and one-line pitch
- Core problem it solves (with market validation logic)
- Target user persona (detailed, specific)
- MVP feature list (10-15 features, prioritized by impact)
- Monetization model with 3 pricing tiers (features per tier)
- User flows (3-5 key flows described step-by-step)
- Growth strategy (5-8 specific acquisition tactics)
- Tech stack suggestion with reasoning
- Launch roadmap (90-day plan with weekly milestones)
- Competitive positioning and moat strategy
- Revenue projection for months 1-6

Format as detailed markdown.`,
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

STRATEGIC CONTEXT:
- Analyze the target audience, pain points, and buying intent
- Optimize for fastest revenue path
- Include monetization strategy, pricing logic, and upsell paths

Requirements:
- Output must be complete, professional, and production-ready
- Use emotional language and real-world framing
- Include clear structure, sections, and deliverables
- Do NOT summarize — write everything in full
- Format clearly using markdown headings and lists
- Assume this will be sold to real customers
- Include specific CTAs, pricing suggestions, and next steps

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
