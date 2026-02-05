import type { NextApiRequest, NextApiResponse } from "next";

export const config = { runtime: "nodejs" };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function callLLM(prompt: string, maxTokens = 2000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const topic = body.topic || body.title;

    if (!topic) return res.status(400).json({ error: "topic required" });

    let title = body.title;
    let subtitle = body.subtitle;

    // Auto-generate title/subtitle if missing
    if (!title || !subtitle) {
      const titlePrompt = `
Generate a premium Amazon-level nonfiction book title and transformation subtitle for:
"${topic}"

Return JSON only:
{"title":"...","subtitle":"..."}
`;
      const raw = await callLLM(titlePrompt, 300);
      const parsed = JSON.parse(raw);
      title = parsed.title;
      subtitle = parsed.subtitle;
    }

    const length = body.length || "medium";
    const chapters = length === "long" ? 8 : length === "short" ? 3 : 5;
    const chapterSize = length === "long" ? "1800–2500 words" : length === "short" ? "700–900 words" : "1200–1600 words";

    let book = "";

    // ===== PAGE 1 — COVER =====
    book += `${title}\n\n${subtitle}\n\nBy NexoraOS\n\n---\n\n`;

    // ===== PAGE 2 — COPYRIGHT =====
    book += `Copyright © ${new Date().getFullYear()} NexoraOS. All rights reserved.

This book is for educational purposes only and does not constitute financial, legal, or professional advice.

No part of this publication may be reproduced without permission.

---\n\n`;

    // ===== PAGE 3 — AUTHOR LETTER =====
    book += `LETTER FROM THE AUTHOR\n\n`;
    book += await callLLM(`
Write a powerful opening letter to the reader for a book titled "${title}" about "${topic}".

Tone:
- Authority-driven
- Mentor-like
- Emotionally grounding
- Transformation-focused

Purpose:
- Why this book exists
- Who it is for
- What the reader will become
- Why this system works

${chapterSize}
`) + "\n\n---\n\n";

    // ===== PAGE 4 — WHAT YOU WILL ACHIEVE =====
    book += `WHAT YOU WILL ACHIEVE FROM THIS BOOK\n\n`;
    book += await callLLM(`
Create a premium outcome list for "${title}" about "${topic}".

Format:
- Bullet points
- Results-focused
- Identity-based
- No fluff

${chapterSize}
`) + "\n\n---\n\n";

    // ===== PAGE 5 — HOW TO USE THIS BOOK =====
    book += `HOW TO USE THIS BOOK\n\n`;
    book += await callLLM(`
Explain how to use this book as a system, not just content.

For book: "${title}" about "${topic}"

Include:
- How to read it
- How to apply it
- Why slow reading matters
- How transformation compounds

${chapterSize}
`) + "\n\n---\n\n";

    // ===== PAGE 6 — TABLE OF CONTENTS =====
    book += `TABLE OF CONTENTS\n\n`;
    const toc = await callLLM(`
Generate ${chapters} premium nonfiction chapter titles for "${title}" about "${topic}".

Rules:
- Outcome-focused
- Psychological journey
- No generic titles
- One per line
`);
    book += toc + "\n\n---\n\n";

    // ===== CHAPTERS =====
    for (let i = 1; i <= chapters; i++) {
      book += `CHAPTER ${i}\n\n`;

      book += await callLLM(`
Write Chapter ${i} of "${title}" about "${topic}".

STRUCTURE (follow exactly):
1. Identity Hook
2. Problem Reality
3. Truth Shift
4. Core Framework (named system)
5. Deep Explanation
6. Real-World Examples
7. Action Steps
8. Identity Reinforcement

Tone:
- Authoritative
- Human
- Persuasive
- Premium publishing style
- No filler
- No generic advice

${chapterSize}
`) + "\n\n---\n\n";
    }

    // ===== SUMMARY =====
    book += `SUMMARY\n\n`;
    book += await callLLM(`
Write a concise, powerful summary for "${title}" about "${topic}".

Tone:
- Confident
- Clear
- Transformational
`) + "\n\n---\n\n";

    // ===== FINAL MESSAGE =====
    book += `FINAL MESSAGE FROM THE AUTHOR\n\n`;
    book += await callLLM(`
Write a closing message that:
- Reinforces reader identity
- Encourages action
- Positions the author as long-term mentor

For "${title}" about "${topic}"
`) + "\n\n---\n\n";

    const wordCount = book.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 450);

    return res.status(200).json({
      title,
      subtitle,
      content: book,
      pages,
      wordCount,
    });
  } catch (err: any) {
    console.error("EBOOK ERROR:", err);
    return res.status(500).json({ error: "Ebook generation failed", detail: err?.message });
  }
        }
