import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAccess, corsHeaders, errorResponse } from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ✅ STRICT SUBSCRIPTION ENFORCEMENT
    const access = await verifyAccess(req);
    
    // HARD ENFORCEMENT: Check status and end_date
    const now = new Date();
    const isExpired = access.subscription?.status === 'expired' || 
                     (access.subscription?.end_date && new Date(access.subscription.end_date) < now);

    if (!access.authorized || isExpired) {
      console.log("Subscription check failed:", access.subscription);
      return errorResponse('Subscription expired', 403);
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found after verification");

    const body = await req.json();
    const { message, analyticsContext } = body;

    if (!message || typeof message !== 'string') throw new Error("Message is required and must be a string");

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    // ✅ Build context from real analytics data
    let dataContext = "";
    console.log("📊 Building context from analytics data...");
    
    if (analyticsContext && typeof analyticsContext === 'object') {
      const { summary = {}, products = [], orders = [] } = analyticsContext;
      
      // Validate summary data
      const totalRevenue = Number(summary.totalRevenue) || 0;
      const totalSales = Number(summary.totalSales) || 0;
      const activeProducts = Number(summary.activeProducts) || 0;
      const conversionRate = Number(summary.conversionRate) || 0;

      // Build product list with real data
      const productList = Array.isArray(products) && products.length > 0
        ? products.slice(0, 10).map((p: any, i: number) => {
            const name = p?.name || "Unknown";
            const price = Number(p?.price) || 0;
            const platform = p?.platform || "unknown";
            const description = p?.description || "";
            return `${i + 1}. ${name} - $${price.toFixed(2)} (${platform})${description ? ` - ${description.substring(0, 100)}` : ""}`;
          }).join("\n")
        : "No products found";

      // Build recent orders list
      const orderList = Array.isArray(orders) && orders.length > 0
        ? orders.slice(0, 10).map((o: any) => {
            const product = o?.product || "Unknown";
            const amount = Number(o?.amount) || 0;
            const date = o?.date ? new Date(o.date).toLocaleDateString() : "N/A";
            const platform = o?.platform || "unknown";
            return `- ${product}: $${amount.toFixed(2)} on ${date} (${platform})`;
          }).join("\n")
        : "No orders found";

      dataContext = `
Here is the user's REAL business analytics data from their connected platforms:

📊 BUSINESS SUMMARY:
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Sales: ${totalSales}
- Active Products: ${activeProducts}
- Conversion Rate: ${conversionRate.toFixed(1)}%

🛍️ TOP PRODUCTS (with real pricing and descriptions):
${productList}

📈 RECENT ORDERS:
${orderList}

⚠️ IMPORTANT: Use this REAL DATA when answering questions about the user's business. Reference specific product names, prices, and sales numbers.`;
      
      console.log("✅ Context built successfully with real data");
    } else {
      console.log("⚠️ No analytics data provided, using generic context");
      dataContext = `
The user has not yet connected their Whop or Payhip accounts, so you don't have access to their real business data yet.
Encourage them to connect their accounts to get personalized insights.`;
    }

    // Get chat history
    const { data: history, error: historyError } = await supabase
      .from("analytics_chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyError) {
      console.warn("⚠️ Error fetching chat history:", historyError);
    }

    const messages = [
      {
        role: "system",
        content: `You are an expert AI Business Advisor specializing in digital product sales and monetization. Your role is to help creators and entrepreneurs diagnose why their digital products aren't selling and provide actionable strategies.

${dataContext}

When analyzing the user's business, follow this comprehensive framework:

1. **Product/Service Quality & Value** - Is the offering unique? Is value clearly communicated?
2. **Pricing Strategy** - Is pricing competitive? Are discounts or bundles offered?
3. **Traffic & Visibility** - Is traffic being driven? Are platform tools being used?
4. **Product Page Optimization** - Is the page compelling? Mobile-friendly? Good visuals?
5. **Target Audience & Messaging** - Is the right audience targeted? Does messaging resonate?
6. **Conversion Rate Optimization** - Is page fast? Is checkout frictionless? A/B testing done?
7. **CAC vs LTV** - Is customer acquisition cost lower than lifetime value?
8. **Market Demand** - Does market exist? Is demand seasonal?
9. **Email List & Follow-up** - Is there an email list? Are leads nurtured?
10. **Analytics & Data** - Are metrics tracked? Where do people drop off?
11. **Platform-Specific Issues** - Are Whop/PayHip tools used effectively?
12. **Psychological Factors** - Are objections addressed? Is social proof shown?
13. **Content & Education** - Is free content created? Are lead magnets offered?
14. **Timing & Seasonality** - Is launch timing right? Are seasonal trends considered?
15. **Feedback & Iteration** - Is customer feedback collected? Are competitors analyzed?

Guidelines:
- Always reference the user's ACTUAL DATA when available (specific product names, prices, sales numbers)
- Be specific with numbers and percentages from their real analytics
- Suggest actionable strategies they can implement today
- If data is limited, acknowledge it and provide general best practices
- Be encouraging but honest about areas needing improvement
- Format responses with clear headings and bullet points
- Keep responses concise but thorough (aim for 200-500 words)
- Ask clarifying questions if needed to provide better advice`,
      },
      ...(history || []).map((m: any) => ({ 
        role: m?.role || "user", 
        content: String(m?.content || "") 
      })),
      { role: "user", content: message },
    ];

    console.log("🤖 Calling Groq API with", messages.length, "messages...");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instant",
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Groq API error:", response.status, errText);
      throw new Error(`AI service error: ${response.status} - ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content?.trim();
    
    if (!reply || typeof reply !== 'string') {
      throw new Error("No response from AI");
    }
    
    reply = String(reply).substring(0, 10000);
    console.log("✅ AI reply generated, length:", reply.length);

    // Save both messages to history
    try {
      await supabase.from("analytics_chat_messages").insert([
        { user_id: user.id, role: "user", content: message },
        { user_id: user.id, role: "assistant", content: reply },
      ]);
    } catch (e) {
      console.error("❌ Error saving chat messages:", e);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("❌ analytics-chat error:", e);
    return errorResponse(msg, 500);
  }
});
