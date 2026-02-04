import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Missing topic" });

    const prompt = `
Generate a powerful professional ebook title and subtitle for this topic:
"${topic}"

Format exactly like this:
Title: ...
Subtitle: ...
`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
        temperature: 0.7
      })
    });

    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const text = j.choices[0].message.content;

    const titleMatch = text.match(/Title:\s*(.*)/i);
    const subtitleMatch = text.match(/Subtitle:\s*(.*)/i);

    res.status(200).json({
      title: titleMatch?.[1] || "Untitled",
      subtitle: subtitleMatch?.[1] || ""
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Title generation failed" });
  }
  }
