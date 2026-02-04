import type { NextApiRequest, NextApiResponse } from "next";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const prompt = `
Generate a bestselling ebook title and subtitle for topic "${topic}".
Return ONLY valid JSON:
{"title":"...","subtitle":"..."}
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
        temperature: 0.6,
        max_tokens: 120,
      }),
    });

    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content || "";
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    res.status(200).json({
      title: json.title || `Mastering ${topic}`,
      subtitle: json.subtitle || `The Complete Guide to ${topic}`,
    });
  } catch {
    res.status(500).json({ error: "Title generation failed" });
  }
}
