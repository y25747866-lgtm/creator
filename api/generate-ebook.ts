import type { NextApiRequest, NextApiResponse } from "next";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 3500) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { title, subtitle, topic, length = "medium" } = req.body;
    if (!title || !subtitle || !topic) {
      return res.status(400).json({ error: "title, subtitle, and topic are required" });
    }

    // ===== LENGTH CONTROL =====
    let chapters = 6;
    let chapterTokens = 3200;
    if (length === "short") {
      chapters = 3;
      chapterTokens = 2200;
    } else if (length === "long") {
      chapters = 10;
      chapterTokens = 3800;
    }

    // ===== MASTER SYSTEM PROMPT =====
    const MASTER_SYSTEM_PROMPT = `
You are NexoraOS Publishing Engine — a world-class professional ebook authoring system.

You produce Amazon bestseller-quality nonfiction ebooks.

Your writing must be:
- Transformational, not informational
- Emotionally intelligent
- Professionally structured
- Long-form
- Clear, confident, mentor-like
- Premium, publish-ready

You are a publishing house, not a chatbot.

━━━━━━━━━━━━━━━━━━━
MANDATORY BOOK STRUCTURE
━━━━━━━━━━━━━━━━━━━

PAGE 1 — COVER (TEXT ONLY)
Title
Subtitle
NexoraOS

PAGE 2 — COPYRIGHT & DISCLAIMER
Include copyright year, NexoraOS ownership, educational disclaimer, no-liability clause, redistribution prohibition.

PAGE 3 — PERSONAL LETTER FROM THE AUTHOR
Purpose:
Build emotional connection, establish authority, explain why book exists, who it’s for, what reader will become.

PAGE 4 — WHAT YOU WILL ACHIEVE FROM THIS BOOK
Bullet-point outcomes, results-focused, identity-driven, benefit-oriented.

PAGE 5 — HOW TO USE THIS BOOK
Explain how to read, apply, pace, and transform. Position book as a system, not content.

PAGE 6 — TABLE OF CONTENTS
Professional, outcome-driven chapter titles with psychological progression.

━━━━━━━━━━━━━━━━━━━
MANDATORY CHAPTER STRUCTURE
━━━━━━━━━━━━━━━━━━━

Every chapter must follow this exact structure:

1. Hook Section
2. Problem Reality
3. Truth Shift
4. Framework/System (named)
5. Deep Explanation
6. Real-World Examples
7. Action Steps
8. Identity Shift

━━━━━━━━━━━━━━━━━━━
FINAL SECTIONS
━━━━━━━━━━━━━━━━━━━

Include:
SUMMARY
CLOSING MESSAGE
NEXT STEPS
BRAND SIGNATURE

━━━━━━━━━━━━━━━━━━━
STYLE RULES
━━━━━━━━━━━━━━━━━━━

Tone:
Confident, warm, mentor-like, emotionally intelligent, authoritative.

Avoid:
Fluff, clichés, robotic phrasing, shallow advice, filler.

━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━

Output:
- Clean formatted text
- No markdown
- No emojis
- No explanations
- No meta commentary
- No JSON
- Ready for PDF rendering

━━━━━━━━━━━━━━━━━━━
CORE IDENTITY
━━━━━━━━━━━━━━━━━━━

You are NexoraOS Publishing Engine.
You produce premium transformational books.
`;

    let book = "";

    // ===== PAGE 1 — COVER TEXT =====
    book += `${title}\n\n${subtitle}\n\nNexoraOS\n\n`;

    // ===== PAGE 2 — COPYRIGHT =====
    const year = new Date().getFullYear();
    book += `COPYRIGHT & DISCLAIMER\n\n`;
    book += `Copyright © ${year} NexoraOS. All rights reserved.\n\n`;
    book += `This ebook is provided for educational and informational purposes only. It is not intended as financial, legal, or professional advice. Always consult qualified professionals before making personal decisions.\n\n`;
    book += `NexoraOS assumes no liability for any losses or damages resulting from the use of this information. The reader bears full responsibility for their actions.\n\n`;
    book += `Redistribution, resale, or commercial use of this ebook without express written permission from NexoraOS is strictly prohibited.\n\n`;
    book += `All intellectual property belongs to NexoraOS.\n\n`;

    // ===== PAGE 3 — PERSONAL LETTER =====
    book += `PERSONAL LETTER FROM THE AUTHOR\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Personal Letter From the Author for this book.\n\nTitle: ${title}\nSubtitle: ${subtitle}\nTopic: ${topic}\nBrand: NexoraOS\n\nTone: Calm, confident, mentor-like, emotionally intelligent.\nPurpose: Build trust, authority, motivation, and commitment.\n\nOutput only the section text.`,
      2000
    );
    book += `\n\n`;

    // ===== PAGE 4 — WHAT YOU WILL ACHIEVE =====
    book += `WHAT YOU WILL ACHIEVE FROM THIS BOOK\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Generate the "What You Will Achieve From This Book" section.\n\nTitle: ${title}\nTopic: ${topic}\n\nRules:\n- Bullet points\n- Outcome-focused\n- Identity-driven\n- No fluff\n\nOutput only the section.`,
      1500
    );
    book += `\n\n`;

    // ===== PAGE 5 — HOW TO USE THIS BOOK =====
    book += `HOW TO USE THIS BOOK\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the "How To Use This Book" section.\n\nTitle: ${title}\nTopic: ${topic}\n\nExplain how to read, apply, pace, and transform. Position the book as a system, not content.\n\nOutput only the section.`,
      1800
    );
    book += `\n\n`;

    // ===== PAGE 6 — TABLE OF CONTENTS =====
    book += `TABLE OF CONTENTS\n\n`;
    const toc = await callAI(
      MASTER_SYSTEM_PROMPT,
      `Generate ${chapters} professional chapter titles for this book.\n\nTitle: ${title}\nTopic: ${topic}\n\nRules:\n- Outcome-driven\n- Psychological progression\n- No fluff\n- One per line\n\nOutput only the chapter titles.`,
      1200
    );
    book += toc + `\n\n`;

    const chapterTitles = toc.split("\n").filter(Boolean);

    // ===== CHAPTERS =====
    for (let i = 0; i < chapters; i++) {
      const chapterTitle = chapterTitles[i] || `Chapter ${i + 1}`;

      book += `${chapterTitle}\n\n`;

      book += await callAI(
        MASTER_SYSTEM_PROMPT,
        `Write Chapter ${i + 1} of this ebook.

Title: ${title}
Subtitle: ${subtitle}
Topic: ${topic}
Chapter Title: ${chapterTitle}

Mandatory structure:
1. Hook Section
2. Problem Reality
3. Truth Shift
4. Framework/System (named)
5. Deep Explanation
6. Real-World Examples
7. Action Steps
8. Identity Shift

Rules:
- Long-form
- Deep
- Human-written
- Transformational
- No filler
- No summaries
- No meta commentary

Output only the chapter text.`,
        chapterTokens
      );

      book += `\n\n`;
    }

    // ===== SUMMARY =====
    book += `SUMMARY\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Summary section for this book.\n\nTitle: ${title}\nTopic: ${topic}\n\nRecap key ideas clearly and confidently. Output only the section.`,
      1500
    );
    book += `\n\n`;

    // ===== CLOSING MESSAGE =====
    book += `CLOSING MESSAGE\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Closing Message from the author.\n\nTitle: ${title}\nTopic: ${topic}\n\nTone: Emotional, empowering, confident, motivating.\nOutput only the section.`,
      1500
    );
    book += `\n\n`;

    // ===== NEXT STEPS =====
    book += `NEXT STEPS\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Next Steps section.\n\nTitle: ${title}\nTopic: ${topic}\n\nEncourage continued learning, action, and growth. Output only the section.`,
      1200
    );
    book += `\n\n`;

    // ===== BRAND SIGNATURE =====
    book += `BRAND SIGNATURE\n\n`;
    book += await callAI(
      MASTER_SYSTEM_PROMPT,
      `Write the Brand Signature section for NexoraOS.\n\nTitle: ${title}\nTopic: ${topic}\n\nReinforce NexoraOS philosophy, authority, and mission. Output only the section.`,
      1200
    );
    book += `\n\n`;

    const wordCount = book.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    res.status(200).json({
      content: book,
      pages,
      wordCount,
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to generate ebook", details: e.message });
  }
          }
