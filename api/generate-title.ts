export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), { status: 400 });
    }

    const systemPrompt = `
You are a professional nonfiction publishing editor.

Generate ONE commercially viable ebook title.

RULES:
- Max 10 words
- Clear benefit-driven promise
- No hype words (ultimate, secret, hacks)
- No motivational fluff
- Must sound authoritative and professional

Topic: ${topic}

Return ONLY the title text.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.2,
        max_tokens: 40,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data = await response.json();
    const title = data.choices[0].message.content.trim();

    return Response.json({ title });
  } catch (err) {
    console.error("generate-title error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate title" }), { status: 500 });
  }
        }
