import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callLLM } from '../lib/llm';  // adjust path if needed

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { topic, tone = 'clear, authoritative, practical', length = 'medium' } = req.body;

  if (!topic?.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    // Generate title
    const titlePrompt = `
Create a strong, high-conversion nonfiction ebook title + subtitle.
Topic: ${topic}
Tone: ${tone}

Output ONLY valid JSON:
{"title":"...", "subtitle":"..."}
    `;
    const titleRaw = await callLLM(titlePrompt, 400);
    let titleData;
    try {
      titleData = JSON.parse(titleRaw);
    } catch {
      titleData = { title: `Mastering ${topic}`, subtitle: 'A Practical Guide' };
    }
    const { title, subtitle } = titleData;

    // Generate outline (simple version)
    const chaptersCount = length === 'short' ? 3 : length === 'long' ? 7 : 5;
    const outlinePrompt = `
Create a logical outline for ebook "${title} – ${subtitle}"
Topic: ${topic}
Tone: ${tone}
${chaptersCount} chapters.

Output ONLY JSON array:
[{"number":1,"title":"Chapter Title","goal":"What reader learns"}]
    `;
    const outlineRaw = await callLLM(outlinePrompt, 800);
    let outline = [];
    try {
      outline = JSON.parse(outlineRaw);
    } catch {
      outline = Array.from({ length: chaptersCount }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}`,
        goal: 'Key concepts'
      }));
    }

    return res.status(200).json({
      jobId: Date.now().toString(),
      title,
      subtitle,
      outline,
      totalChapters: chaptersCount,
      status: 'outline_done'
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
  }
