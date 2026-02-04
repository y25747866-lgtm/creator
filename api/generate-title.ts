import type { NextApiRequest, NextApiResponse } from "next";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const systemPrompt = `
You are NexoraOS Publishing Engine.
Generate one premium nonfiction book title and one transformation-focused subtitle.

Rules:
- Title must be bold, benefit-driven, emotionally compelling
- Subtitle must clearly state the transformation or outcome
- Avoid clichés, generic phrases, or buzzwords
- Must feel Amazon bestseller-level

Output ONLY valid JSON:
{"title":"...","subtitle":"..."}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic: ${topic}` },
        ],
        temperature: 0.8,
        max_tokens: 120,
      }),
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const text = data.choices[0].message.content.trim();

    const json = JSON.parse(text);
    res.status(200).json(json);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to generate title", details: e.message });
  }
}
