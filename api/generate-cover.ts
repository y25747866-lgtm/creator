import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { title, subtitle } = req.body;
    if (!title || !subtitle) return res.status(400).json({ error: "title and subtitle required" });

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
            content: `
Generate a professional book cover design prompt for:
Title: "${title}"
Subtitle: "${subtitle}"
Brand: NexoraOS

Include:
- Emotional tone
- Mood
- Color palette
- Visual symbolism
- Typography
- Composition

Amazon bestseller quality.
`,
          },
        ],
        max_tokens: 300,
      }),
    });

    const j = await r.json();
    res.status(200).json({ prompt: j.choices[0].message.content });
  } catch {
    res.status(500).json({ error: "Cover generation failed" });
  }
      }
