import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateSection(prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.7
    })
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { title, subtitle, topic, length } = req.body;

    let chapters = 4;
    let chapterDetail = "800-1200 words";
    if (length === "long") {
      chapters = 10;
      chapterDetail = "1500-2500 words";
    } else if (length === "short") {
      chapters = 2;
      chapterDetail = "400-700 words";
    }

    // PAGE 1 — COVER PAGE (TEXT)
    let content = `${title}\n\n`;
    content += `${subtitle}\n\n`;
    content += `NexoraOS\n\n`;

    // PAGE 2 — COPYRIGHT & DISCLAIMER
    content += `COPYRIGHT & DISCLAIMER\n\n`;
    content += `Copyright © ${new Date().getFullYear()} NexoraOS. All rights reserved.\n\n`;
    content += `This ebook is provided for educational and informational purposes only. It is not intended as financial, legal, or professional advice. Always consult qualified professionals for personal decisions.\n\n`;
    content += `NexoraOS assumes no liability for any losses or damages resulting from the use of this information. The reader bears full responsibility for their actions.\n\n`;
    content += `Redistribution, resale, or commercial use of this ebook without express written permission from NexoraOS is strictly prohibited.\n\n`;
    content += `All intellectual property belongs to NexoraOS.\n\n`;

    // PAGE 3 — PERSONAL LETTER FROM THE AUTHOR
    content += `PERSONAL LETTER FROM THE AUTHOR\n\n`;
    content += await generateSection(`Write a sincere, persuasive letter from the author for ebook "\( {title}" about " \){topic}". Include why this book exists, who it’s for, why it works, what the reader will become, emotional motivation, authority positioning. Calm, strong, mentor-like tone. ${chapterDetail}.`);

    // PAGE 4 — WHAT YOU WILL ACHIEVE FROM THIS BOOK
    content += `WHAT YOU WILL ACHIEVE FROM THIS BOOK\n\n`;
    content += await generateSection(`Create a bullet-point outcome list for ebook "\( {title}" about " \){topic}". Skills gained, mindsets shifted, problems solved, results promised. Each bullet benefit-driven. No fluff. ${chapterDetail}.`);

    // PAGE 5 — HOW TO USE THIS BOOK
    content += `HOW TO USE THIS BOOK\n\n`;
    content += await generateSection(`Explain how to use this book for ebook "\( {title}" about " \){topic}". How to read it, how to apply it, what pace to follow, how transformation happens, what commitment is required. Position the book as a system, not content. ${chapterDetail}.`);

    // PAGE 6 — TABLE OF CONTENTS
    content += `TABLE OF CONTENTS\n\n`;
    content += await generateSection(`Generate professional chapter titles for ebook "\( {title}" about " \){topic}". Outcome-focused phrasing, logical progression, psychological journey structure. Output only the list of chapters, one per line. Number of chapters: ${chapters}.`);

    // CHAPTERS
    for (let i = 1; i <= chapters; i++) {
      content += `CHAPTER ${i}\n\n`;
      content += await generateSection(`Write a full premium chapter for ebook "\( {title}" about " \){topic}". Chapter ${i}. Follow this structure exactly: Hook Section, Problem Reality, Truth Shift, Framework/System (named), Deep Explanation, Real-World Examples, Action Steps, Identity Shift. Long-form, no shallow summaries, no filler, human-written feel. ${chapterDetail}.`);
    }

    // FINAL PAGES
    content += `SUMMARY\n\n`;
    content += await generateSection(`Summarize key lessons for ebook "\( {title}" about " \){topic}". Clear and confident. ${chapterDetail}.`);

    content += `CLOSING MESSAGE\n\n`;
    content += await generateSection(`Motivational closing from the author for ebook "\( {title}" about " \){topic}". ${chapterDetail}.`);

    content += `NEXT STEPS\n\n`;
    content += await generateSection(`Encourage continued learning and growth for ebook "\( {title}" about " \){topic}". ${chapterDetail}.`);

    content += `BRAND SIGNATURE\n\n`;
    content += await generateSection(`Reinforce brand authority and philosophy for NexoraOS in ebook "\( {title}" about " \){topic}". ${chapterDetail}.`);

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    // Save to Supabase if needed (keep if you have it)
    const { error } = await supabase.from('ebooks').insert({
      title,
      topic,
      content,
      pages,
    });
    if (error) throw error;

    res.status(200).json({ content, pages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
      }
