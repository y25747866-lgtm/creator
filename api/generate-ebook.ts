import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------- AI CALL ----------
async function generateText(prompt: string) {
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
      max_tokens: 3500,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ---------- API HANDLER ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { title, topic, length = "medium" } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ error: "title and topic are required" });
    }

    let chapters = 4;
    let wordsPerChapter = "700–1000 words";

    if (length === "short") {
      chapters = 2;
      wordsPerChapter = "400–600 words";
    } else if (length === "long") {
      chapters = 8;
      wordsPerChapter = "1200–1600 words";
    }

    // ---------- BUILD BOOK ----------
    let content = "";

    // COVER
    content += `# ${title}\n\n`;
    content += `${topic}\n\n`;
    content += `NexoraOS\n\n`;

    // INTRO
    content += `## Introduction\n\n`;
    content += await generateText(
      `Write a powerful motivational introduction for an ebook titled "${title}" about "${topic}". Speak directly to the reader. Inspire confidence, clarity, and action.`
    );
    content += "\n\n";

    // TOC
    content += `## Table of Contents\n\n`;
    content += Array.from({ length: chapters }, (_, i) => `Chapter ${i + 1}`).join("\n");
    content += "\n\n";

    // CHAPTERS
    for (let i = 1; i <= chapters; i++) {
      content += `## Chapter ${i}\n\n`;
      content += await generateText(
        `Write a full high-quality ebook chapter for "${title}" about "${topic}". Chapter ${i}. Structure: Hook → Problem → Framework → Deep Explanation → Examples → Action Steps → Mindset Shift. ${wordsPerChapter}.`
      );
      content += "\n\n";
    }

    // CLOSING
    content += `## Final Thoughts\n\n`;
    content += await generateText(
      `Write a strong motivational closing message for the ebook "${title}" about "${topic}".`
    );

    const wordCount = content.split(/\s+/).length;
    const pages = Math.ceil(wordCount / 450);

    // SAVE TO SUPABASE (optional but safe)
    await supabase.from("ebooks").insert({
      title,
      topic,
      content,
      pages,
    });

    return res.status(200).json({ content, pages });
  } catch (error: any) {
    console.error("Ebook generation error:", error);
    return res.status(500).json({ error: error.message || "Generation failed" });
  }
      }
