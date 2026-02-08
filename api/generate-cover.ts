import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callLLM } from '../lib/llm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, subtitle, topic } = req.body;

  if (!title || !subtitle) {
    return res.status(400).json({ error: 'title and subtitle required' });
  }

  try {
    const prompt = `
Create a professional ebook cover prompt for Flux.1 or Midjourney.
Title: "${title}"
Subtitle: "${subtitle}"
Topic: ${topic || 'nonfiction'}

Style: modern, minimalist, premium, strong typography, no faces.
Vertical format (1600x2560), high contrast.
Output ONLY the image prompt text.
    `;
    const coverPrompt = await callLLM(prompt, 600);

    return res.status(200).json({
      coverPrompt,
      // If you add real image generation later, return imageUrl here
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
      }
