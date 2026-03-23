import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

async function checkUserSubscription(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;

    const now = new Date();
    const endDate = data.end_date ? new Date(data.end_date) : null;
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

    const isActive = (!endDate || endDate > now) && (!expiresAt || expiresAt > now);

    if (!isActive) {
      // Auto-update status to expired
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", data.id)
        .catch((err: any) => console.error("Failed to update expired status:", err));
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error checking subscription:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, title, description, targetAudience, offerDetails } = await req.json();

    console.log("📥 Request received:", { platform, title });

    // Validate required fields
    if (!platform || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", success: false, results: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header", success: false, results: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ CHECK SUBSCRIPTION ACCESS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", success: false, results: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasAccess = await checkUserSubscription(supabase, user.id);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ 
          error: "Subscription expired or inactive. Please upgrade your plan.",
          success: false, 
          results: [] 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      console.error("❌ GROQ_API_KEY not configured, using fallback");
      return generateFallbackResults(platform, title, description);
    }

    // Build prompt
    let prompt = "";
    if (platform === "sales_page") {
      prompt = `Create 3 different sales page variations for:
Title: ${title}
Description: ${description}
Target Audience: ${targetAudience || "General"}
Offer Details: ${offerDetails || "Premium offer"}

For each variation, provide ONLY this JSON format (no other text):
{"headline": "...", "subheadline": "...", "problem": "...", "solution": "...", "benefits": "...", "cta": "..."}`;
    } else {
      prompt = `Create 3 different ${platform} posts for:
Product: ${title}
Description: ${description}

For each post, provide ONLY this JSON format (no other text):
{"hook": "...", "main_copy": "...", "cta": "...", "hashtags": "..."}`;
    }

    console.log("🤖 Calling Groq API with model: llama-3.1-8b-instant");

    try {
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
          max_tokens: 1500,
        }),
      });

      if (!groqResponse.ok) {
        const errorData = await groqResponse.json();
        console.error("❌ Groq API error:", errorData);
        return generateFallbackResults(platform, title, description);
      }

      const groqData = await groqResponse.json();
      const content = groqData.choices?.[0]?.message?.content;

      if (!content) {
        console.error("❌ No content from Groq");
        return generateFallbackResults(platform, title, description);
      }

      console.log("✅ Groq response received, length:", content.length);

      // Parse JSON results from content
      const results = parseResults(content, platform, title, description);

      if (results.length === 0) {
        console.warn("⚠️ No results parsed, using fallback");
        return generateFallbackResults(platform, title, description);
      }

      console.log("✅ Returning", results.length, "results");
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
    } catch (apiError) {
      console.error("❌ API call failed:", apiError);
      return generateFallbackResults(platform, title, description);
    }
  } catch (error: unknown) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
        results: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function parseResults(content: string, platform: string, title: string, description: string) {
  const results = [];

  // Try to find JSON objects in the content
  const jsonMatches = content.match(/\{[^{}]*"[^"]*"[^{}]*\}/g) || [];

  for (const match of jsonMatches) {
    try {
      const parsed = JSON.parse(match);
      if (platform === "sales_page") {
        if (parsed.headline && parsed.cta) {
          results.push({
            headline: parsed.headline || "",
            subheadline: parsed.subheadline || "",
            problem: parsed.problem || "",
            solution: parsed.solution || "",
            benefits: parsed.benefits || "",
            cta: parsed.cta || "",
          });
        }
      } else {
        if (parsed.hook && parsed.cta) {
          results.push({
            hook: parsed.hook || "",
            main_copy: parsed.main_copy || "",
            cta: parsed.cta || "",
            hashtags: parsed.hashtags || "",
          });
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  return results.slice(0, 3); // Return max 3 results
}

function generateFallbackResults(platform: string, title: string, description: string) {
  let results = [];

  if (platform === "sales_page") {
    results = [
      {
        headline: `Transform Your Business with ${title}`,
        subheadline: description || "The ultimate solution you've been waiting for",
        problem: "You're struggling with inefficiency and lost revenue",
        solution: `${title} solves this with cutting-edge technology`,
        benefits: "Save time • Increase revenue • Improve efficiency",
        cta: "Get Started Today",
      },
      {
        headline: `Discover the Power of ${title}`,
        subheadline: "Join thousands of successful users",
        problem: "Your competition is ahead",
        solution: `${title} gives you the competitive edge`,
        benefits: "Expert support • Proven results • Guaranteed ROI",
        cta: "Start Your Free Trial",
      },
      {
        headline: `Why ${title} is the #1 Choice`,
        subheadline: "Industry leaders trust us",
        problem: "You need a solution you can rely on",
        solution: `${title} delivers unmatched quality and support`,
        benefits: "24/7 support • Money-back guarantee • Easy setup",
        cta: "Learn More",
      },
    ];
  } else {
    results = [
      {
        hook: `🚀 Just discovered something amazing about ${title}!`,
        main_copy: description || "This is exactly what I've been looking for. Game changer!",
        cta: "Check it out",
        hashtags: `#${platform} #${title.toLowerCase().replace(/\s+/g, "")} #mustread`,
      },
      {
        hook: `💡 Your life is about to change with ${title}`,
        main_copy: "Don't sleep on this opportunity. Seriously.",
        cta: "Tap the link",
        hashtags: `#${platform} #trending #innovation`,
      },
      {
        hook: `🔥 Why everyone is talking about ${title}...`,
        main_copy: "Here's what you need to know before it's too late.",
        cta: "Swipe up",
        hashtags: `#${platform} #viral #essential`,
      },
    ];
  }

  console.log("📤 Returning fallback results:", results.length);
  return new Response(
    JSON.stringify({
      success: true,
      results,
      platform,
      title,
      fallback: true,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
