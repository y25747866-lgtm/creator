import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { topic } = req.body as { topic: string };

    if (!topic) return res.status(400).json({ error: 'Missing topic' });

    // Prompt for premium title + subtitle
    const prompt = `Generate a big, bold main title (H1-style) for an ebook on "${topic}". Should be clear, actionable, and promise a transformation. Example: "The $10K Blueprint".
Generate a subtitle (H2-style). Should explain the benefit or outcome in one line. Example: "How Beginners Build Profitable Online Income in 90 Days".
Output only JSON: {"title": "Main Title", "subtitle": "Subtitle"}`;

    const resAI = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      })
    });

    if (!resAI.ok) throw new Error(await resAI.text());

    const data = await resAI.json();
    const generated = JSON.parse(data.choices[0].message.content);

    res.status(200).json({ title: generated.title, subtitle: generated.subtitle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to generate title" });
  }
  }
