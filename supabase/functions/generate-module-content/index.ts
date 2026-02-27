import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { moduleId, moduleType, title, topic } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

    let prompt = `
You are a professional marketing copywriter.

Create a ${moduleType} for this product:

Title: ${title}
Topic: ${topic}

Write detailed, high-quality, real-world marketing content.
Return markdown.
`;

    const groqRes = await fetch(
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
              content: "You are an expert digital marketing strategist.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      }
    );

    const data = await groqRes.json();

    const aiText =
      data.choices?.[0]?.message?.content ||
      "Failed to generate content.";

    // insert version
    await supabase.from("monetization_versions").insert({
      module_id: moduleId,
      version_number: 1,
      content: {
        markdown: aiText,
      },
    });

    // update module status
    await supabase
      .from("monetization_modules")
      .update({
        status: "generated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", moduleId);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
