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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { platform, title, description = "", targetAudience = "", offerDetails = "" } = await req.json();
    if (!platform || !title) throw new Error("Missing platform or title");

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");

    let prompt = platform === "sales_page" 
      ? `Generate 3 sales pages for: ${title}. Desc: ${description}. Audience: ${targetAudience}. Offer: ${offerDetails}. Return JSON: [{headline, subheadline, problem, solution, benefits, cta}]`
      : `Generate 3 ${platform} posts for: ${title}. ${description}. Return JSON: [{hook, main_copy, cta, hashtags, platform}]`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen/qwen3-32b", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1200 }),
    });

    if (!response.ok) throw new Error("Groq API error");

    const groqData = await response.json();
    const content = groqData.choices[0]?.message?.content;
    let results = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      results = [{ headline: title, hook: title, main_copy: description, cta: "Learn More", platform }];
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
