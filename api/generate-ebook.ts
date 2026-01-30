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
    const { title, topic, length } = req.body;

    let chapters = 4;
    let chapterDetail = "800-1200 words";
    if (length === "long") {
      chapters = 10;
      chapterDetail = "1500-2500 words";
    } else if (length === "short") {
      chapters = 2;
      chapterDetail = "400-700 words";
    }

    let content = `# ${title}\n\n`;

    content += "## Introduction\n\n";
    content += await generateSection(`Write detailed introduction for ebook "\( {title}" about " \){topic}". Engaging, overview, examples.`);

    for (let i = 1; i <= chapters; i++) {
      content += `\n\n## Chapter ${i}\n\n`;
      content += await generateSection(`Write detailed chapter (\( {chapterDetail}) for " \){title}" about "${topic}". Part ${i}. Use subsections, bullet points, examples, stories.`);
    }

    content += "\n\n## Conclusion\n\n";
    content += await generateSection(`Write detailed conclusion for "\( {title}" about " \){topic}". Summarize, inspire.`);

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 500);

    // Save to Supabase DB
    const { error } = await supabase.from('ebooks').insert({
      title,
      topic,
      content,
      pages,
      // user_id: req.user?.id || null, // Add auth later
    });

    if (error) throw error;

    res.status(200).json({ content, pages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
