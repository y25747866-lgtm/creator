import type { NextApiRequest, NextApiResponse } from "next";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 3000) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function generateTitleInternal(topic: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [
        {
          role: "system",
          content: `
You are NexoraOS Publishing Engine.
Generate one premium nonfiction book title and subtitle.

Output ONLY valid JSON:
{"title":"...","subtitle":"..."}
`,
        },
        { role: "user", content: `Topic: ${topic}` },
      ],
      temperature: 0.8,
      max_tokens: 120,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let { title, subtitle, topic, length = "medium" } = req.body;

    if (!topic) return res.status(400).json({ error: "topic is required" });

    // 🔥 AUTO-GENERATE TITLE/SUBTITLE IF MISSING
    if (!title || !subtitle) {
      const generated = await generateTitleInternal(topic);
      title = generated.title;
      subtitle = generated.subtitle;
    }

    let chapters = 6;
    let chapterTokens = 3000;
    if (length === "short") {
      chapters = 3;
      chapterTokens = 2000;
    } else if (length === "long") {
      chapters = 10;
      chapterTokens = 3800;
    }

    const MASTER_SYSTEM_PROMPT = `
You are NexoraOS Publishing Engine — a world-class professional ebook authoring system.

You produce Amazon bestseller-quality nonfiction ebooks.

MANDATORY STRUCTURE:

PAGE 1 — COVER (TEXT ONLY)
Title
Subtitle
NexoraOS

PAGE 2 — COPYRIGHT & DISCLAIMER

PAGE 3 — PERSONAL LETTER FROM THE AUTHOR

PAGE 4 — WHAT YOU WILL ACHIEVE FROM THIS BOOK

PAGE 5 — HOW TO USE THIS BOOK

PAGE 6 — TABLE OF CONTENTS

Each chapter must follow:
Hook → Problem → Truth → Framework → Deep Explanation → Examples → Action Steps → Identity Shift

Final sections:
SUMMARY
CLOSING MESSAGE
NEXT STEPS
BRAND SIGNATURE

Tone:
Confident, mentor-like, emotionally intelligent, professional.

No emojis.
No markdown.
No meta commentary.
Clean formatted text.
`;

    let book = "";

    // COVER
    book += `${title}\n\n${subtitle}\n\nNexoraOS\n\n`;

    // COPYRIGHT
    const year = new Date().getFullYear();
    book += `COPYRIGHT & DISCLAIMER\n\n`;
    book += `Copyright © ${year} NexoraOS. All rights reserved.\n\n`;
    book += `This ebook is provided for educational and informational purposes only. It is not intended as financial, legal, or professional advice. Always consult qualified professionals.\n\n`;
    book += `NexoraOS assumes no liability for any losses or damages resulting from the use of this information. The reader bears full responsibility for their actions.\n\n`;
    book += `Redistribution, resale, or commercial use of this ebook without express written permission from NexoraOS is strictly prohibited.\n\n`;
    book += `All intellectual property belongs to NexoraOS.\n\n`;

    // PERSONAL LETTER
    book += `PERSONAL LETTER FROM THE AUTHOR\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Personal Letter From the Author.

Title: ${title}
Subtitle: ${subtitle}
Topic: ${topic}
Brand: NexoraOS

Purpose: Build emotional connection, authority, motivation, and trust.

Output only the section.`,
      1800
    );
    book += `\n\n`;

    // ACHIEVEMENTS
    book += `WHAT YOU WILL ACHIEVE FROM THIS BOOK\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the "What You Will Achieve From This Book" section.

Title: ${title}
Topic: ${topic}

Rules:
- Bullet points
- Outcome-driven
- Identity-based
- No fluff

Output only the section.`,
      1400
    );
    book += `\n\n`;

    // HOW TO USE
    book += `HOW TO USE THIS BOOK\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the "How To Use This Book" section.

Title: ${title}
Topic: ${topic}

Explain how to read, apply, pace, and transform. Position the book as a system.

Output only the section.`,
      1600
    );
    book += `\n\n`;

    // TOC
    book += `TABLE OF CONTENTS\n\n`;
    const toc = await callAI(
      MASTER_SYSTEM_PROMPT,
      `Generate ${chapters} professional chapter titles.

Title: ${title}
Topic: ${topic}

Rules:
- Outcome-driven
- Psychological progression
- One per line
- No fluff

Output only the chapter titles.`,
      1200
    );
    book += toc + `\n\n`;

    const chapterTitles = toc.split("\n").filter(Boolean);

    // CHAPTERS
    for (let i = 0; i < chapters; i++) {
      const chapterTitle = chapterTitles[i] || `Chapter ${i + 1}`;

      book += `${chapterTitle}\n\n`;

      book += await callAI(
        MASTER_SYSTEM_PROMPT,
        `Write Chapter ${i + 1}.

Book Title: ${title}
Subtitle: ${subtitle}
Topic: ${topic}
Chapter Title: ${chapterTitle}

Structure:
1. Hook
2. Problem Reality
3. Truth Shift
4. Framework/System (named)
5. Deep Explanation
6. Real-World Examples
7. Action Steps
8. Identity Shift

Rules:
- Long-form
- Premium quality
- No fluff
- No summaries
- No meta commentary

Output only the chapter.`,
        chapterTokens
      );

      book += `\n\n`;
    }

    // SUMMARY
    book += `SUMMARY\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Summary section.

Title: ${title}
Topic: ${topic}

Recap key ideas clearly and confidently.

Output only the section.`,
      1400
    );
    book += `\n\n`;

    // CLOSING
    book += `CLOSING MESSAGE\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Closing Message from the author.

Title: ${title}
Topic: ${topic}

Tone: Emotional, empowering, motivating.

Output only the section.`,
      1400
    );
    book += `\n\n`;

    // NEXT STEPS
    book += `NEXT STEPS\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Next Steps section.

Title: ${title}
Topic: ${topic}

Encourage continued learning and action.

Output only the section.`,
      1200
    );
    book += `\n\n`;

    // BRAND SIGNATURE
    book += `BRAND SIGNATURE\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Brand Signature for NexoraOS.

Title: ${title}
Topic: ${topic}

Reinforce NexoraOS philosophy, authority, and mission.

Output only the section.`,
      1200
    );
    book += `\n\n`;

    const wordCount = book.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    res.status(200).json({
      title,
      subtitle,
      content: book,
      pages,
      wordCount,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Ebook generation failed", details: e.message });
  }
        }
