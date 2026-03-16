import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("🚀 generate-marketing function called");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ Missing authorization header");
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      throw new Error("Unauthorized");
    }

    console.log("✅ User authenticated:", user.id);

    // Parse request body
    const body = await req.json();
    const { platform, title, description = "", targetAudience = "", offerDetails = "" } = body;

    console.log("📝 Request:", { platform, title });

    // Validate required fields
    if (!platform || !title) {
      throw new Error("Missing required fields: platform and title");
    }

    // Get Groq API key
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      console.error("❌ GROQ_API_KEY not configured");
      throw new Error("GROQ_API_KEY not configured");
    }

    // Build prompt based on platform
    let prompt = "";
    if (platform === "sales_page") {
      prompt = `Generate 3 compelling sales page variations for a product.

Product Title: ${title}
Description: ${description}
Target Audience: ${targetAudience}
Offer Details: ${offerDetails}

For each variation, provide a JSON object with these exact fields:
- headline: A compelling headline (max 10 words)
- subheadline: A supporting subheadline (max 15 words)  
- problem: The main problem being solved (1-2 sentences)
- solution: How the product solves it (1-2 sentences)
- benefits: Key benefits (1-2 sentences)
- cta: Call-to-action text (max 5 words)

Return ONLY a valid JSON array with exactly 3 objects. No other text.`;
    } else {
      prompt = `Generate 3 social media posts for ${platform}.

Product/Topic: ${title}
Description: ${description}

For each post, provide a JSON object with these exact fields:
- hook: An attention-grabbing opening line (max 15 words)
- main_copy: The main message (max 100 words)
- cta: Call-to-action (max 10 words)
- hashtags: Relevant hashtags (comma-separated)
- platform: "${platform}"

Return ONLY a valid JSON array with exactly 3 objects. No other text.`;
    }

    console.log("🤖 Calling Groq API...");

    // Call Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-32b",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error("❌ Groq API error:", errorData);
      throw new Error(`Groq API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const groqData = await groqResponse.json();
    console.log("✅ Groq API response received");

    // Extract content from response
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) {
      console.error("❌ No content from AI model");
      throw new Error("No content from AI model");
    }

    console.log("📄 Content length:", content.length);

    // Parse JSON from response
    let results = [];
    try {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
        console.log("✅ JSON parsed successfully, results count:", results.length);
      } else {
        console.warn("⚠️ No JSON array found in response, using fallback");
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
    } catch (parseError) {
      console.error("⚠️ JSON parse error:", parseError);
      // Return fallback data if parsing fails
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

    console.log("✅ Returning results");

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        platform,
        title,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("❌ Error in generate-marketing:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
