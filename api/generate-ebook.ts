import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function callAI(prompt: string, maxTokens = 1800): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
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

    const chapters =
      length === "long" ? 10 : length === "short" ? 2 : 5;

    const chapterSize =
      length === "long"
        ? "1200–1800 words"
        : length === "short"
        ? "500–800 words"
        : "800–1200 words";

    let content = "";

    // PAGE 1 — COVER TEXT
    content += `${title}\n\n${topic}\n\nNexoraOS\n\n`;

    // PAGE 2 — COPYRIGHT
    content += `COPYRIGHT & DISCLAIMER\n\n`;
    content += `Copyright © ${new Date().getFullYear()} NexoraOS. All rights reserved.\n\n`;
    content += `This ebook is for educational purposes only. Not financial or legal advice.\n\n`;
    content += `No liability assumed. All rights reserved.\n\n`;

    // PAGE 3 — AUTHOR LETTER
    content += `PERSONAL LETTER FROM THE AUTHOR\n\n`;
    content += await callAI(
      `Write a sincere, authoritative personal letter from the author to the reader for an ebook titled "${title}" about "${topic}". Emotional, motivational, premium tone. 400–600 words.`
    );

    // PAGE 4 — WHAT YOU WILL ACHIEVE
    content += `\n\nWHAT YOU WILL ACHIEVE FROM THIS BOOK\n\n`;
    content += await callAI(
      `Write a powerful bullet-point outcome list for an ebook titled "${title}" about "${topic}". Each bullet benefit-driven, concrete, premium.`
    );

    // PAGE 5 — HOW TO USE THIS BOOK
    content += `\n\nHOW TO USE THIS BOOK\n\n`;
    content += await callAI(
      `Explain how to use this ebook titled "${title}" about "${topic}" for maximum transformation. Systematic, mentor tone.`
    );

    // PAGE 6 — TABLE OF CONTENTS
    content += `\n\nTABLE OF CONTENTS\n\n`;
    const toc = await callAI(
      `Generate ${chapters} premium chapter titles for an ebook titled "${title}" about "${topic}". Output only numbered chapter titles, one per line.`
    );
    content += toc + "\n\n";

    // CHAPTERS
    for (let i = 1; i <= chapters; i++) {
      content += `CHAPTER ${i}\n\n`;
      content += await callAI(
        `Write Chapter ${i} of an ebook titled "${title}" about "${topic}". Follow this structure exactly:

Hook
Problem Reality
Truth Shift
Framework/System (named)
Deep Explanation
Real-World Example
Action Steps
Identity Shift

Long-form, premium, human tone. ${chapterSize}.`,
        2200
      );
      content += "\n\n";
    }

    // SUMMARY
    content += `SUMMARY\n\n`;
    content += await callAI(
      `Write a strong executive-style summary for an ebook titled "${title}" about "${topic}".`
    );

    // CLOSING
    content += `\n\nCLOSING MESSAGE\n\n`;
    content += await callAI(
      `Write a motivational closing message from the author for an ebook titled "${title}" about "${topic}".`
    );

    // NEXT STEPS
    content += `\n\nNEXT STEPS\n\n`;
    content += await callAI(
      `Write actionable next steps for readers of an ebook titled "${title}" about "${topic}".`
    );

    // BRAND SIGNATURE
    content += `\n\nBRAND SIGNATURE\n\n`;
    content += await callAI(
      `Write a premium brand signature section for NexoraOS for an ebook titled "${title}" about "${topic}".`
    );

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 450);

    // Save to Supabase (optional)
    try {
      await supabase.from("ebooks").insert({
        title,
        topic,
        content,
        pages,
      });
    } catch (e) {
      console.warn("Supabase insert failed (ignored):", e);
    }

    res.status(200).json({ content, pages });
  } catch (e: any) {
    console.error("Ebook generation error:", e);
    res.status(500).json({ error: "Ebook generation failed", detail: e.message });
  }
  }
