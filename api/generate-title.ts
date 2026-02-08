import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callLLM } from '../lib/llm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { topic, tone = 'clear, authoritative, practical' } = req.body;

  if (!topic?.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    const prompt = `
You are a top nonfiction title strategist.
Topic: ${topic}
Tone: ${tone}

Create ONE high-conversion title + subtitle.
Output ONLY valid JSON:
{"title":"...", "subtitle":"..."}
    `;
    const raw = await callLLM(prompt, 400);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { title: `Mastering ${topic}`, subtitle: 'Practical Guide' };
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
      }
