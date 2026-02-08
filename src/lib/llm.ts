// lib/llm.ts
// Shared LLM calling function for OpenRouter (or any OpenAI-compatible API)

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
        "HTTP-Referer": "https://nexoraos.vercel.app", // change to your domain if you want
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
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
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

// Optional helper: for when you want JSON output
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
