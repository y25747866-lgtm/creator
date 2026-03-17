import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, title, description, targetAudience, offerDetails } = await req.json();

    // Validate required fields
    if (!platform || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    console.log("🔑 GROQ_API_KEY exists:", !!groqApiKey);
    if (!groqApiKey) {
      console.error("❌ GROQ_API_KEY not set in environment");
      throw new Error("GROQ_API_KEY not configured");
    }

    console.log("🎯 Generating content for platform:", platform);
    console.log("📝 Title:", title);

    // Build prompt based on platform
    let prompt = "";
    if (platform === "sales_page") {
      prompt = `You are an expert sales copywriter. Create a compelling sales page for:
Title: ${title}
Description: ${description}
Target Audience: ${targetAudience}
Offer Details: ${offerDetails}

Generate exactly 3 different sales page variations. Each should have:
- headline (catchy main headline)
- subheadline (supporting headline)
- problem (customer pain point)
- solution (how your product solves it)
- benefits (key benefits list)
- cta (call to action text)

Return ONLY a valid JSON array with exactly 3 objects. No other text.`;
    } else {
      prompt = `You are an expert social media marketer. Create engaging ${platform} posts for:
Product: ${title}
Description: ${description}

Generate exactly 3 different ${platform} posts. Each should have:
- hook (attention-grabbing opening)
- main_copy (body text)
- cta (call to action)
- hashtags (relevant hashtags)

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
        model: "llama-3.1-8b-instant",
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
      console.error("❌ Groq API error status:", groqResponse.status);
      console.error("❌ Groq API error data:", errorData);
      throw new Error(`Groq API error (${groqResponse.status}): ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    const groqData = await groqResponse.json();
    console.log("✅ Groq API response received");

    // Extract content from response
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) {
      console.error("❌ No content from AI model");
      throw new Error("No content from AI model");
    }

    console.log("📄 Content from AI:", content.substring(0, 300));

    // Parse JSON from response
    let results = [];
    
    try {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
        console.log("✅ JSON parsed successfully, results count:", results.length);
      } else {
        console.warn("⚠️ No JSON array found in response");
      }
    } catch (parseError) {
      console.error("⚠️ JSON parse error:", parseError);
    }

    // Ensure we always have results
    if (!Array.isArray(results) || results.length === 0) {
      console.warn("⚠️ No valid results from AI, using fallback");
      if (platform === "sales_page") {
        results = [
          {
            headline: title,
            subheadline: description || "Transform your business",
            problem: "You need better results",
            solution: "Our solution delivers exactly what you need",
            benefits: "Save time, increase revenue, improve efficiency",
            cta: "Get Started Today",
          },
          {
            headline: `Discover ${title}`,
            subheadline: "The solution you've been looking for",
            problem: "Struggling with inefficiency",
            solution: "We solve this with proven methods",
            benefits: "Faster results, lower costs, better outcomes",
            cta: "Start Your Free Trial",
          },
          {
            headline: `Why Choose ${title}?`,
            subheadline: "Industry-leading results guaranteed",
            problem: "Competition is tough",
            solution: "We give you the edge you need",
            benefits: "Expert support, proven track record, guaranteed results",
            cta: "Learn More",
          },
        ];
      } else {
        results = [
          {
            hook: `Just discovered something amazing about ${title}! 🤯`,
            main_copy: description || "This changes everything. Check it out.",
            cta: "Learn more",
            hashtags: `#${platform} #${title.toLowerCase().replace(/\s+/g, '')}`,
          },
          {
            hook: `Your life is about to change with ${title} ✨`,
            main_copy: "Don't miss out on this opportunity.",
            cta: "Tap the link",
            hashtags: `#${platform} #trending`,
          },
          {
            hook: `Why everyone is talking about ${title}...`,
            main_copy: "Here's what you need to know.",
            cta: "Swipe up",
            hashtags: `#${platform} #mustread`,
          },
        ];
      }
    }

    console.log("✅ Returning results, count:", results.length);
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
