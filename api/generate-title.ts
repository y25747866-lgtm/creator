import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const BRAND_NAME = process.env.BRAND_NAME || "NexoraOS";
const TITLE_STYLE = process.env.TITLE_STYLE || "amazon_nonfiction";
const TITLE_TONE = process.env.TITLE_TONE || "authoritative";
const MAX_WORDS = Number(process.env.TITLE_MAX_WORDS || 10);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const systemPrompt = `
You are a professional nonfiction publishing editor.

Generate ONE commercially viable ebook title.

RULES:
- Max ${MAX_WORDS} words
- Clear benefit-driven promise
- No hype words (ultimate, secret, hacks)
- No motivational fluff
- Must sound authoritative and professional
- Suitable for Amazon business/self-improvement nonfiction

STYLE: ${TITLE_STYLE}
TONE: ${TITLE_TONE}
BRAND: ${BRAND_NAME}

Topic: ${topic}

Return ONLY the title text.
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.2,
      max_tokens: 40,
    });

    const title = completion.choices[0].message.content?.trim();
    res.status(200).json({ title });
  } catch (error) {
    console.error("generate-title error:", error);
    res.status(500).json({ error: "Failed to generate title" });
  }
    }
