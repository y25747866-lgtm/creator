import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, verifyAccess } from "../_shared/validation.ts";

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  prompt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const access = await verifyAccess(req);
    if (!access.authorized || !access.userId) {
      return errorResponse(access.error || 'Subscription required', 403);
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }

    const body: LLMOptions = await req.json();
    const { prompt, model = "mistralai/mixtral-8x7b-instruct:v0.1", maxTokens = 2000, temperature = 0.7 } = body;

    if (!prompt) {
      return errorResponse("Prompt is required", 400);
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://nexoraos.vercel.app",
        "X-Title": "NexoraOS Ebook Generator",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No content returned from LLM");
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("❌ call-openrouter error:", e);
    return errorResponse(msg, 500);
  }
});
