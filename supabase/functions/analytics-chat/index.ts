import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");
    const salesGuide = `
# Digital Product Sales Troubleshooting Guide

## Why Digital Products Aren't Selling - Complete Analysis Framework

### 1. Product/Service Quality & Value
- **Is your offering unique or competitive?** Are you solving a specific problem better than others?
- **Is the value clear?** Do your product descriptions communicate why someone should buy?

### 2. Pricing Strategy
- **Is your pricing competitive?** Research similar products and adjust accordingly.
- **Are you offering discounts or bundling?** Limited-time offers can incentivize buyers.

### 3. Traffic & Visibility
- **Are you driving traffic?** Use social media, email, paid ads, collaborations, content marketing.
- **Are you using platform tools?** Use Whop's promote section and PayHip's affiliate system.

### 4. Product Page Optimization
- **Title & description:** Use clear, keyword-rich titles and benefit-focused descriptions.
- **Visuals:** High-quality images, videos, or demos.
- **Social proof:** Testimonials, reviews, case studies.
- **Mobile optimization:** Is your page mobile-friendly?

### 5. Target Audience & Messaging
- **Are you targeting the right audience?** Define your ideal customer profile.
- **Is your messaging resonating?** Use language that speaks to pain points.

### 6. Conversion Rate Optimization
- **Page load speed:** Optimize for fast loading.
- **Checkout process:** Keep it simple and frictionless.
- **A/B testing:** Test different titles, prices, images.

### 7. Customer Acquisition Cost (CAC) vs. Lifetime Value (LTV)
- **If CAC > LTV, you're losing money.** Adjust pricing or reduce ad spend.

### 8. Market Demand
- **Does a market exist?** Use Google Trends, keyword research.
- **Is demand seasonal?** Adjust marketing based on trends.

### 9. Email List & Follow-up
- **Build an email list:** Email has the highest ROI.
- **Nurture leads:** Not everyone buys on first visit.

### 10. Analytics & Data
- **Track metrics:** Views, conversion rate, CAC, LTV, refund rate.
- **Identify friction:** Where are people dropping off?

### 11. Platform-Specific Issues
- **Whop:** Use affiliate program, engage community, optimize categories.
- **PayHip:** Use affiliate tools, create coupons, capture emails.

### 12. Psychological Factors
- **Address objections:** Is it worth it? Will it work for me?
- **Social proof:** Testimonials, case studies, user counts.

### 13. Content & Education
- **Create free content:** Demonstrate expertise and build trust.
- **Lead magnets:** Offer free resources for emails.

### 14. Timing & Seasonality
- **Launch timing:** Choose the right time.
- **Seasonal trends:** Adjust based on demand patterns.

### 15. Feedback & Iteration
- **Get customer feedback:** Ask what they liked and what could improve.
- **Analyze competitors:** What are they doing differently?
`;

    const { message, analyticsContext } = await req.json();
    if (!message) throw new Error("Message is required");

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    // Build context from analytics data
    let dataContext = "";
    console.log("analyticsContext:", analyticsContext);
    if (analyticsContext && (analyticsContext.summary || analyticsContext.products?.length > 0 || analyticsContext.orders?.length > 0)) {
      const { summary = {}, products = [], orders = [] } = analyticsContext;
      dataContext = `
Here is the user's current business analytics data:

SUMMARY:
- Total Revenue: $${(summary.totalRevenue || 0).toFixed(2)}
- Total Sales: ${summary.totalSales || 0}
- Active Products: ${summary.activeProducts || 0}
- Conversion Rate: ${summary.conversionRate || 0}%

TOP PRODUCTS:
${products.slice(0, 5).map((p: any, i: number) => `${i + 1}. ${p.name} - $${p.price || "N/A"} (${p.platform})`).join("\n") || "No products found"}

RECENT ORDERS:
${orders.slice(0, 5).map((o: any) => `- ${o.product}: $${o.amount} on ${o.date ? new Date(o.date).toLocaleDateString() : "N/A"} (${o.platform})`).join("\n") || "No orders found"}
`;
      console.log("Data context built:", dataContext.substring(0, 200));
    } else {
      console.log("No analytics data provided");
    }

    // Get chat history
    const { data: history } = await supabase
      .from("analytics_chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = [
      {
        role: "system",
        content: `You are an expert AI Business Advisor who specializes in diagnosing why digital products aren't selling for digital product creators. You analyze sales data and provide actionable insights and recommendations.

${dataContext}

Use this comprehensive framework to analyze the user's Whop and PayHip accounts:
1. Product/Service Quality & Value - Is the offering unique? Is value clear?
2. Pricing Strategy - Is pricing competitive? Are discounts offered?
3. Traffic & Visibility - Is traffic being driven? Are platform tools used?
4. Product Page Optimization - Is the page compelling? Mobile-friendly?
5. Target Audience & Messaging - Is the right audience targeted? Does messaging resonate?
6. Conversion Rate Optimization - Is page fast? Checkout frictionless? A/B testing done?
7. CAC vs LTV - Is customer acquisition cost lower than lifetime value?
8. Market Demand - Does market exist? Is demand seasonal?
9. Email List & Follow-up - Is there an email list? Are leads nurtured?
10. Analytics & Data - Are metrics tracked? Where do people drop off?
11. Platform-Specific Issues - Are Whop/PayHip tools used effectively?
12. Psychological Factors - Are objections addressed? Is social proof shown?
13. Content & Education - Is free content created? Are lead magnets offered?
14. Timing & Seasonality - Is launch timing right? Are seasonal trends considered?
15. Feedback & Iteration - Is customer feedback collected? Are competitors analyzed?


Guidelines:
- Always reference the user's actual data when giving advice
- Be specific with numbers and percentages
- Suggest actionable strategies they can implement today
- If data is limited, acknowledge it and give general best practices
- Be encouraging but honest about areas needing improvement
- Format responses with clear headings and bullet points when appropriate
- Keep responses concise but thorough`,
      },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instant",
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("No response from AI");
    
    // Ensure reply is a string and not too long
    reply = String(reply).substring(0, 10000);
    console.log("AI reply length:", reply.length);

    // Save both messages to history
    await supabase.from("analytics_chat_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analytics-chat error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
