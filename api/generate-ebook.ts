import type { NextApiRequest, NextApiResponse } from "next";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function callAI(prompt: string, maxTokens = 2500) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
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
    const { title, topic, length } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ error: "title and topic are required" });
    }

    let chapters = 5;
    let chapterSize = "900–1200 words";
    if (length === "short") {
      chapters = 3;
      chapterSize = "500–700 words";
    } else if (length === "long") {
      chapters = 9;
      chapterSize = "1400–1800 words";
    }

    // ---------------------------
    // 1️⃣ Front Matter (Fast)
    // ---------------------------
    const frontMatter = `
# ${title}

${topic}

NexoraOS

---

## Copyright & Disclaimer

Copyright © ${new Date().getFullYear()} NexoraOS. All rights reserved.

This ebook is for educational purposes only. It does not replace professional advice. You are responsible for how you apply the ideas in this book.

Redistribution or resale without permission is prohibited.

---

## Letter From The Author

${await callAI(`
Write a sincere, authoritative author letter for a professional ebook titled "${title}" about "${topic}". 
Tone: confident, mentor-like, premium publishing style. 
Explain who this book is for, why it works, and what transformation the reader will achieve.
400–600 words.
`, 1200)}

---

## What You Will Achieve

${await callAI(`
Create a bullet-point outcome list for an ebook titled "${title}" about "${topic}". 
Each bullet must be benefit-driven and concrete. 
No fluff. 8–12 bullets.
`, 800)}

---

## How To Use This Book

${await callAI(`
Explain how to use this ebook titled "${title}" about "${topic}". 
Position it as a system, not just information. 
Explain pacing, application, and commitment.
300–500 words.
`, 900)}
`;

    // ---------------------------
    // 2️⃣ Table of Contents
    // ---------------------------
    const tocRaw = await callAI(`
Generate ${chapters} professional chapter titles for an ebook titled "${title}" about "${topic}".
Titles must be outcome-driven and progression-based.
Output only the list, one per line.
`, 600);

    const chapterTitles = tocRaw
      .split("\n")
      .map((l: string) => l.replace(/^\d+[\).\s-]*/, "").trim())
      .filter(Boolean)
      .slice(0, chapters);

    let content = frontMatter + `\n---\n\n## Table of Contents\n\n`;
    chapterTitles.forEach((t: string, i: number) => {
      content += `${i + 1}. ${t}\n`;
    });

    // ---------------------------
    // 3️⃣ Chapters (Optimized)
    // ---------------------------
    for (let i = 0; i < chapterTitles.length; i++) {
      const chapterTitle = chapterTitles[i];

      const chapter = await callAI(`
Write Chapter ${i + 1} of a premium ebook titled "${title}" about "${topic}".

Chapter title: "${chapterTitle}"

Structure EXACTLY:
1. Hook (emotionally gripping opening)
2. Problem Reality (current struggle of reader)
3. Truth Shift (core mindset reframe)
4. Framework/System (named system)
5. Deep Explanation (step-by-step breakdown)
6. Real-World Examples
7. Action Steps (clear bullets)
8. Identity Shift (who the reader becomes)

Style:
- Human, authoritative, professional
- No fluff
- No summaries
- Long-form

Length: ${chapterSize}.
`, 2600);

      content += `\n\n---\n\n# Chapter ${i + 1}: ${chapterTitle}\n\n${chapter}`;
    }

    // ---------------------------
    // 4️⃣ Closing Sections
    // ---------------------------
    const summary = await callAI(`
Summarize the key lessons of the ebook titled "${title}" about "${topic}".
Clear, structured, motivating.
300–500 words.
`, 900);

    const closing = await callAI(`
Write a powerful closing message for the ebook titled "${title}" about "${topic}".
Tone: confident, transformational, premium publishing style.
200–400 words.
`, 700);

    const nextSteps = await callAI(`
Write a "Next Steps" section for the ebook titled "${title}" about "${topic}".
Encourage continued growth and disciplined action.
200–300 words.
`, 600);

    content += `
\n\n---\n\n# Summary\n\n${summary}

\n\n---\n\n# Closing Message\n\n${closing}

\n\n---\n\n# Next Steps\n\n${nextSteps}

\n\n---\n\n# Brand Signature

NexoraOS exists to build systems, not motivation.  
Knowledge compounds only when applied daily with structure and discipline.
`;

    const wordCount = content.split(/\s+/).length;
    const pages = Math.max(8, Math.ceil(wordCount / 450));

    res.status(200).json({ content, pages });
  } catch (e: any) {
    console.error("Ebook generation error:", e);
    res.status(500).json({
      error: "Ebook generation failed",
      detail: e.message || "Unknown error",
    });
  }
      }
