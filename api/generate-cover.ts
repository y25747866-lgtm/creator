import type { NextApiRequest, NextApiResponse } from "next";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { title, subtitle } = req.body;
    if (!title || !subtitle) return res.status(400).json({ error: "title and subtitle required" });

    const prompt = `
Design an Amazon bestseller ebook cover.

Title: "${title}"
Subtitle: "${subtitle}"
Author/Brand: NexoraOS

Return a single, detailed image-generation prompt including:
Mood, lighting, colors, symbolism, typography, composition, camera framing.
`;

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
        max_tokens: 250,
      }),
    });

    const j = await r.json();
    const text = j.choices?.[0]?.message?.content?.trim();

    if (!text) throw new Error("No cover prompt");

    res.status(200).json({ prompt: text });
  } catch (e) {
    res.status(500).json({ error: "Cover generation failed" });
  }
}
