// lib/llm.ts
// Reusable helper to call OpenRouter (or any OpenAI-compatible LLM API)

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callLLM(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const {
    model = "mistralai/mixtral-8x7b-instruct:v0.1",
    maxTokens = 2000,
    temperature = 0.7,
  } = options;

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://nexoraos.vercel.app", // optional — helps OpenRouter track usage
        "X-Title": "NexoraOS Ebook Generator",        // optional
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

    return content;
  } catch (error) {
    console.error("LLM call failed:", error);
    throw error;
  }
}

// Helper for when you expect JSON output (more reliable)
export async function callLLMJson<T = any>(
  prompt: string,
  options: LLMOptions = {}
): Promise<T> {
  const text = await callLLM(prompt, options);

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("JSON parse failed:", text);
    throw new Error("LLM returned invalid JSON");
  }
                           }
