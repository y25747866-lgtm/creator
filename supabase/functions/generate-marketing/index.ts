import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { platform, title, description, targetAudience, offerDetails } = await req.json();

    if (!platform || !title) {
      return new Response(
        JSON.stringify({ error: "platform and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (platform === "instagram") {
      systemPrompt = `You are a top-tier Instagram marketing copywriter. You create engaging, short-form content with relevant hashtags. Always return valid JSON.`;
      userPrompt = `Generate 3 Instagram marketing posts for:
Title: ${title}
Description: ${description || "N/A"}

Return a JSON array with exactly 3 objects. Each object must have:
- "hook": a compelling opening line
- "main_copy": the main post body (short, engaging, with emojis)
- "cta": a call to action
- "hashtags": relevant hashtags string

Return ONLY the JSON array, no other text.`;
    } else if (platform === "x") {
      systemPrompt = `You are a top-tier X (Twitter) marketing copywriter. You write punchy, thread-style content with platform-native tone. Always return valid JSON.`;
      userPrompt = `Generate 3 X (Twitter) marketing thread starters for:
Title: ${title}
Description: ${description || "N/A"}

Return a JSON array with exactly 3 objects. Each object must have:
- "hook": a punchy opening tweet
- "main_copy": a 3-5 tweet thread body (separated by newlines)
- "cta": a closing call to action tweet

Return ONLY the JSON array, no other text.`;
    } else if (platform === "sales_page") {
      systemPrompt = `You are a world-class conversion copywriter specializing in sales pages. You write persuasive, structured content that converts. Always return valid JSON.`;
      userPrompt = `Generate 3 full sales page drafts for:
Product Title: ${title}
Product Description: ${description || "N/A"}
Target Audience: ${targetAudience || "General"}
Offer Details: ${offerDetails || "N/A"}

Return a JSON array with exactly 3 objects. Each object must have:
- "headline": a powerful main headline
- "subheadline": a supporting subheadline
- "problem": the problem section (2-3 paragraphs)
- "solution": the solution section (2-3 paragraphs)
- "benefits": a bullet list of 5-7 benefits (as a single string with newlines)
- "cta": a compelling call to action section

Return ONLY the JSON array, no other text.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid platform. Use: instagram, x, or sales_page" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-32b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 4000,
        }),
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return new Response(
        JSON.stringify({ error: `AI generation failed (${groqRes.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await groqRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Also handle thinking tags from qwen models
    const thinkMatch = jsonStr.match(/<\/think>\s*([\s\S]*)/);
    if (thinkMatch) {
      jsonStr = thinkMatch[1].trim();
    }

    let results;
    try {
      results = JSON.parse(jsonStr);
    } catch {
      // Try to find array in the string
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        results = JSON.parse(arrMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response", raw: rawContent }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-marketing error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
