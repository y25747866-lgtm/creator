import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, tone = 'clear, authoritative, practical', length = 'medium' } = req.body;

  if (!topic?.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    // Generate title
    const titleRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct:v0.1",
        messages: [{ role: "user", content: `Create title and subtitle for topic "\( {topic}" in tone " \){tone}". Output JSON: {"title":"...", "subtitle":"..."}` }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!titleRes.ok) {
      throw new Error(`OpenRouter error: ${await titleRes.text()}`);
    }

    const titleData = await titleRes.json();
    const titleText = titleData.choices[0].message.content.trim();
    let { title, subtitle } = JSON.parse(titleText);

    // Generate outline
    const chaptersCount = length === 'short' ? 3 : length === 'long' ? 7 : 5;
    const outlineRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct:v0.1",
        messages: [{ role: "user", content: `Create outline for "${title} – \( {subtitle}" on " \){topic}" with ${chaptersCount} chapters. Output JSON array: [{"number":1, "title":"...", "goal":"..."}]` }],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!outlineRes.ok) {
      throw new Error(`OpenRouter error: ${await outlineRes.text()}`);
    }

    const outlineData = await outlineRes.json();
    const outlineText = outlineData.choices[0].message.content.trim();
    let outline = JSON.parse(outlineText);

    // Generate full content (simplified for demo; expand as needed)
    let content = `\( {title}\n \){subtitle}\n\n`;

    for (const ch of outline) {
      const chapterPrompt = `Write chapter \( {ch.number}: " \){ch.title}" for ebook on "${topic}". Tone: ${tone}. Goal: ${ch.goal}. 800-1200 words.`;
      const chapterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistralai/mixtral-8x7b-instruct:v0.1",
          messages: [{ role: "user", content: chapterPrompt }],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!chapterRes.ok) {
        throw new Error(`OpenRouter error: ${await chapterRes.text()}`);
      }

      const chapterData = await chapterRes.json();
      content += `Chapter ${ch.number}: \( {ch.title}\n\n \){chapterData.choices[0].message.content.trim()}\n\n`;
    }

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 450);

    return res.status(200).json({ title, subtitle, outline, content, pages });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
        }
