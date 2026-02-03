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

    let content = `---\n`;
    content += `title: ${title}\n`;
    content += `tagline: ${subtitle}\n`;
    content += `author: Yesh Malik\n`;
    content += `github: yourgithubusername\n`;
    content += `twitter: @yourtwiiterhandle\n`;
    content += `coverimage: (cover image here)\n`;
    content += `date: ${new Date().getFullYear()}\n`;
    content += `---\n\n`;

    content += `Copyright (c) ${new Date().getFullYear()} NexoraOS. All rights reserved.\n`;
    content += `This ebook is for educational purposes only. No liability is assumed.\n\n`;

    content += `## Table of Contents\n\n`;
    content += `* [Introduction](#introduction)\n`;
    for (let i = 1; i <= chapters; i++) {
      content += `* [Chapter \( {i}](#chapter- \){i})\n`;
    }
    content += `* [Conclusion](#conclusion)\n\n`;

    // Introduction
    content += `<a name="introduction"></a>\n## Introduction\n\n`;
    content += await generateSection(`Write an engaging introduction for ebook "\( {title}" about " \){topic}". Address reader directly ('you'), describe pain points, build hope. Short paragraphs. Motivational. ${chapterDetail}.`);

    // Chapters
    for (let i = 1; i <= chapters; i++) {
      content += `<a name="chapter-${i}"></a>\n## Chapter ${i}\n\n`;
      content += await generateSection(`Write a premium chapter for "\( {title}" about " \){topic}". Emotional hook, what this chapter covers, why it matters, step-by-step framework, common mistakes, action task. ${chapterDetail}.`);
    }

    // Conclusion
    content += `<a name="conclusion"></a>\n## Conclusion\n\n`;
    content += await generateSection(`Write a premium conclusion for "\( {title}" about " \){topic}". Reassure reader, encourage implementation, motivate action. Short paragraphs. ${chapterDetail}.`);

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    // Save to Supabase (optional)
    const { error } = await supabase.from('ebooks').insert({ title, topic, content, pages });
    if (error) throw error;

    res.status(200).json({ content, pages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
    }
