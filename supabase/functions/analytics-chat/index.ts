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

    const { message, analyticsContext } = await req.json();
    if (!message) throw new Error("Message is required");

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    // Build context from analytics data
    let dataContext = "";
    if (analyticsContext) {
      const { summary, products, orders } = analyticsContext;
      dataContext = `
Here is the user's current business analytics data:

SUMMARY:
- Total Revenue: $${summary?.totalRevenue?.toFixed(2) || "0.00"}
- Total Sales: ${summary?.totalSales || 0}
- Active Products: ${summary?.activeProducts || 0}
- Conversion Rate: ${summary?.conversionRate || 0}%

TOP PRODUCTS:
${(products || []).slice(0, 10).map((p: any, i: number) => `${i + 1}. ${p.name} - $${p.price || "N/A"} (${p.platform})`).join("\n")}

RECENT ORDERS (last 10):
${(orders || []).slice(0, 10).map((o: any) => `- ${o.product}: $${o.amount} on ${o.date ? new Date(o.date).toLocaleDateString() : "N/A"} (${o.platform})`).join("\n")}
`;
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
        content: `You are an expert AI Business Advisor for digital product creators. You analyze sales data and provide actionable insights and recommendations.

${dataContext}

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
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("No response from AI");

    // Save both messages to history
    await supabase.from("analytics_chat_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analytics-chat error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
