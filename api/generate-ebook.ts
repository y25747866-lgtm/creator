import type { NextApiRequest, NextApiResponse } from 'next';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

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

    let chapters = length === "long" ? 10 : length === "short" ? 5 : 8;
    let chapterDetail = length === "long" ? "1500-2500 words" : length === "short" ? "600-1000 words" : "1000-1500 words";

    let content = `# ${title}\n\n`;

    content += `${subtitle}\n\n`;

    // Table of Contents
    content += `## Table of Contents\n\n`;
    content += `- [Introduction](#introduction)\n`;
    for (let i = 1; i <= chapters; i++) {
      content += `- [Chapter \( {i}](#chapter- \){i})\n`;
    }
    content += `- [Conclusion](#conclusion)\n\n`;

    // Introduction
    content += `<a name="introduction"></a>\n## Introduction\n\n`;
    content += await generateSection(`Write a premium introduction for ebook "\( {title}" about " \){topic}". Address reader directly, describe pain points, build hope, explain transformation. Motivational tone. ${chapterDetail}.`);

    // Chapters
    for (let i = 1; i <= chapters; i++) {
      content += `<a name="chapter-${i}"></a>\n## Chapter ${i}\n\n`;
      content += await generateSection(`Write a premium chapter for "\( {title}" about " \){topic}". Chapter ${i}. Emotional hook, what this chapter covers, why it matters, step-by-step framework, common mistakes, action task. ${chapterDetail}.`);
    }

    // Conclusion
    content += `<a name="conclusion"></a>\n## Conclusion\n\n`;
    content += await generateSection(`Write a premium conclusion for "\( {title}" about " \){topic}". Reassure, motivate action, final call to implement. ${chapterDetail}.`);

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    res.status(200).json({ content, pages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to generate ebook" });
  }
}
