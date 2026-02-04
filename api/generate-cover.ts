import type { NextApiRequest, NextApiResponse } from "next";

export const config = { runtime: "nodejs" };

async function callAI(prompt: string, max = 250) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: max,
    }),
  });

  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() || "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let { title, subtitle, topic } = req.body;

    // 🔥 AUTO-GENERATE if missing
    if (!title || !subtitle) {
      const t = await callAI(`
Generate a bestselling ebook title and subtitle for topic "${topic || "business success"}".
Return ONLY JSON:
{"title":"...","subtitle":"..."}
`, 120);

      const parsed = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] || "{}");
      title = parsed.title || "The Ultimate Success Blueprint";
      subtitle = parsed.subtitle || "How to Build Wealth, Power, and Freedom";
    }

    const prompt = `
Design an Amazon bestseller ebook cover.

Title: "${title}"
Subtitle: "${subtitle}"
Author: NexoraOS

Return a single detailed image prompt including:
Mood, lighting, colors, symbolism, typography, composition.
`;

    const coverPrompt = await callAI(prompt, 250);

    res.status(200).json({ title, subtitle, prompt: coverPrompt });
  } catch {
    res.status(500).json({ error: "Cover generation failed" });
  }
}
