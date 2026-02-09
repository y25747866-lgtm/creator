import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, subtitle, topic = 'nonfiction' } = req.body;

  if (!title || !subtitle) {
    return res.status(400).json({ error: 'title and subtitle are required' });
  }

  try {
    const prompt = `
Create a detailed image prompt for an ebook cover.
Title: "${title}"
Subtitle: "${subtitle}"
Topic: ${topic}

Style: modern, minimalist, premium, strong typography, no faces.
Vertical format (ebook size).
High contrast, professional.

Output ONLY the image prompt text.
    `.trim();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct:v0.1",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${await response.text()}`);
    }

    const data = await response.json();
    const coverPrompt = data.choices[0].message.content.trim();

    return res.status(200).json({ coverPrompt });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to generate cover prompt' });
  }
}
