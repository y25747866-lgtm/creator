import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "topic required" });

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [
          {
            role: "user",
            content: `Generate a premium nonfiction book title and subtitle for "${topic}". Output JSON only: {"title":"","subtitle":""}`,
          },
        ],
        max_tokens: 200,
      }),
    });

    const j = await r.json();
    const parsed = JSON.parse(j.choices[0].message.content);
    res.status(200).json(parsed);
  } catch {
    res.status(500).json({ error: "Title generation failed" });
  }
}
