import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { platform, title, description = "", targetAudience = "", offerDetails = "" } = await req.json();
    if (!platform || !title) throw new Error("Missing platform or title");

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");

    let prompt = "";
    if (platform === "sales_page") {
      prompt = `Generate 3 compelling sales page variations for a product.
Product Title: ${title}
Description: ${description}
Target Audience: ${targetAudience}
Offer Details: ${offerDetails}

For each variation, provide a JSON object with:
- headline: A compelling headline (max 10 words)
- subheadline: A supporting subheadline (max 15 words)
- problem: The main problem being solved (1-2 sentences)
- solution: How the product solves it (1-2 sentences)
- benefits: Key benefits (1-2 sentences)
- cta: Call-to-action text (max 5 words)

Return ONLY a valid JSON array of 3 objects.`;
    } else {
      prompt = `Generate 3 social media posts for ${platform}.
Product/Topic: ${title}
Description: ${description}

For each post, provide a JSON object with:
- hook: An attention-grabbing opening line (max 15 words)
- main_copy: The main message (max 100 words)
- cta: Call-to-action (max 10 words)
- hashtags: Relevant hashtags (comma-separated)
- platform: "${platform}"

Return ONLY a valid JSON array of 3 objects.`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-32b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API error:", errorData);
      throw new Error(`Groq API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const groqData = await response.json();
    const content = groqData.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content from AI model");
    }

    let results = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      results = [
        {
          headline: title,
          subheadline: description,
          problem: "Market need",
          solution: "Our solution",
          benefits: "Quality and value",
          cta: "Get Started",
          hook: title,
          main_copy: description,
          hashtags: "#marketing",
          platform: platform,
        },
      ];
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Generate marketing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
