import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { topic } = req.body;

    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const prompt = `
You are a world-class publishing studio.
Generate a powerful, benefit-driven book title and a bold transformation subtitle for topic "${topic}".
Title must signal expertise and promise transformation.
Subtitle must clarify the outcome.
Output only JSON:
{"title": "Title", "subtitle": "Subtitle"}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const text = data.choices[0].message.content.trim();

    const json = JSON.parse(text);

    res.status(200).json(json);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate title' });
  }
        }
