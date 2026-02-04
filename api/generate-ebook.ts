import type { NextApiRequest, NextApiResponse } from "next";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

async function callAI(prompt: string, maxTokens = 2800) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: maxTokens,
    }),
  });

  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  return j.choices[0].message.content.trim();
}

async function autoGenerateTitle(topic: string) {
  const prompt = `
Generate a professional nonfiction ebook title and subtitle for:
"${topic}"

Format:
Title: ...
Subtitle: ...
`;
  const text = await callAI(prompt, 120);
  return {
    title: text.match(/Title:\s*(.*)/i)?.[1] || topic,
    subtitle: text.match(/Subtitle:\s*(.*)/i)?.[1] || "",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let { title, subtitle, topic, length = "medium" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    if (!title || !subtitle) {
      const auto = await autoGenerateTitle(topic);
      title = auto.title;
      subtitle = auto.subtitle;
    }

    const chapters = length === "long" ? 10 : length === "short" ? 3 : 6;

    let book = "";

    // Cover
    book += `${title}\n\n${subtitle}\n\nNexoraOS\n\n`;

    // Copyright
    const year = new Date().getFullYear();
    book += `COPYRIGHT & DISCLAIMER\n\n`;
    book += `Copyright © ${year} NexoraOS. All rights reserved.\n\n`;
    book += `This ebook is provided for educational and informational purposes only. It is not intended as financial, legal, or professional advice. Always consult qualified professionals.\n\n`;
    book += `NexoraOS assumes no liability for any losses or damages resulting from the use of this information. The reader bears full responsibility for their actions.\n\n`;
    book += `Redistribution, resale, or commercial use of this ebook without express written permission from NexoraOS is strictly prohibited.\n\n`;
    book += `All intellectual property belongs to NexoraOS.\n\n`;

    // Personal Letter
    book += `PERSONAL LETTER FROM THE AUTHOR\n\n`;
    book += await callAI(`Write a powerful, sincere author letter for an ebook titled "${title}" about "${topic}". Build authority, trust, and emotional motivation.`);
    book += `\n\n`;

    // Outcomes
    book += `WHAT YOU WILL ACHIEVE FROM THIS BOOK\n\n`;
    book += await callAI(`Write bullet-point outcomes for readers of "${title}" about "${topic}". Outcome-driven, no fluff.`);
    book += `\n\n`;

    // How to use
    book += `HOW TO USE THIS BOOK\n\n`;
    book += await callAI(`Explain how to read and apply this book "${title}" about "${topic}" to get real results. System-based approach.`);
    book += `\n\n`;

    // TOC
    book += `TABLE OF CONTENTS\n\n`;
    const toc = await callAI(`Generate ${chapters} professional chapter titles for "${title}" about "${topic}". One per line.`);
    book += toc + `\n\n`;
    const chapterTitles = toc.split("\n").filter(Boolean);

    // Chapters
    for (let i = 0; i < chapters; i++) {
      const chTitle = chapterTitles[i] || `Chapter ${i + 1}`;
      book += `${chTitle}\n\n`;
      book += await callAI(
        `Write a full premium chapter for "${title}" about "${topic}". Chapter: "${chTitle}". Structure: Hook, Problem, Truth Shift, Framework, Deep Explanation, Examples, Action Steps, Identity Shift.`,
        3500
      );
      book += `\n\n`;
    }

    // Summary
    book += `SUMMARY\n\n`;
    book += await callAI(`Summarize the core lessons of "${title}" about "${topic}".`);
    book += `\n\n`;

    // Closing
    book += `CLOSING MESSAGE\n\n`;
    book += await callAI(`Write a motivational closing message from the author for "${title}" about "${topic}".`);
    book += `\n\n`;

    // Next Steps
    book += `NEXT STEPS\n\n`;
    book += await callAI(`Write next steps for readers of "${title}" about "${topic}".`);
    book += `\n\n`;

    // Brand Signature
    book += `BRAND SIGNATURE\n\n`;
    book += await callAI(`Write a brand signature for NexoraOS related to "${title}" about "${topic}".`);

    const wordCount = book.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    res.status(200).json({ title, subtitle, content: book, pages, wordCount });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Ebook generation failed" });
  }
}
