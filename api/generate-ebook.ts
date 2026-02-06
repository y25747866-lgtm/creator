import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function callLLM(prompt: string, maxTokens = 1800): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'your-app-name',           // required by some providers
          'X-Title': 'Ebook Chapter',
        },
        body: JSON.stringify({
          model: 'mistralai/mixtral-8x7b-instruct:v0.1', // or better: anthropic/claude-3-haiku, meta-llama/llama-3.1-70b-instruct, etc.
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.65,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter error: ${res.status} - ${err}`);
      }

      const data = await res.json();
      return data.choices[0].message.content.trim();
    } catch (err) {
      console.error(`LLM attempt ${attempt} failed:`, err);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 1200 * attempt)); // backoff
    }
  }
  throw new Error('LLM retries exhausted');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, tone = 'clear and practical', length = 'medium' } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    // Auto-generate title + subtitle (fast, low tokens)
    const titlePrompt = `
You are a high-conversion nonfiction book title expert.
Topic: ${topic}
Tone: ${tone}

Generate ONE powerful, benefit-driven title + subtitle.
Output ONLY JSON:
{
  "title": "Main Title",
  "subtitle": "Subtitle that promises transformation and contains keywords"
}
    `.trim();

    const titleJson = await callLLM(titlePrompt, 300);
    let titleData: { title: string; subtitle: string };
    try {
      titleData = JSON.parse(titleJson);
    } catch {
      titleData = { title: `Mastering ${topic}`, subtitle: `Practical Strategies for Real Results` };
    }

    const title = titleData.title.trim();
    const subtitle = titleData.subtitle.trim();

    let chaptersCount = length === 'short' ? 3 : length === 'long' ? 7 : 5;
    let wordsPerChapter = length === 'short' ? 700 : length === 'long' ? 1400 : 1000;

    // Generate outline first (cheap & helps consistency)
    const outlinePrompt = `
Create a clear, logical chapter outline for an ebook titled "${title}" – ${subtitle}
Topic: ${topic}
Tone: ${tone}
Target length: ~\( {chaptersCount} chapters, each ~ \){wordsPerChapter} words

Output ONLY JSON array of chapters:
[
  {"number":1, "title":"Chapter Title", "goal":"Main goal of this chapter"},
  ...
]
    `.trim();

    const outlineRaw = await callLLM(outlinePrompt, 800);
    let chapters: { number: number; title: string; goal: string }[] = [];
    try {
      chapters = JSON.parse(outlineRaw);
    } catch {
      // fallback
      chapters = Array.from({ length: chaptersCount }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}: Key Aspects of ${topic}`,
        goal: `Help reader understand and apply core concept ${i + 1}`,
      }));
    }

    let markdown = `# \( {title}\n\n \){subtitle}\n\nBy NexoraOS\n\n`;

    // Introduction
    const introPrompt = `Write an engaging 400–600 word introduction for "${title} – ${subtitle}". Address the reader directly, highlight pain points, promise transformation. Tone: ${tone}.`;
    markdown += `## Introduction\n\n${await callLLM(introPrompt, 1200)}\n\n`;

    // Table of Contents
    markdown += `## Table of Contents\n\n`;
    chapters.forEach(ch => {
      markdown += `- Chapter ${ch.number}: ${ch.title}\n`;
    });
    markdown += `\n\n`;

    // Chapters – one by one, lower max_tokens per call
    for (const ch of chapters) {
      const chapterPrompt = `
You are writing Chapter \( {ch.number} of " \){title} – ${subtitle}"
Chapter title: ${ch.title}
Main goal: ${ch.goal}
Tone: ${tone} – clear, actionable, motivational without fluff

Structure:
1. Hook (question or bold statement)
2. Explain the problem / current reality
3. Introduce framework / method
4. Deep explanation with logic
5. Real-world examples or case studies
6. Step-by-step action plan
7. Mindset shift or key takeaway

Write in clean markdown. ~${wordsPerChapter} words.
Start directly with content – no "In this chapter..." meta text.
      `.trim();

      const chapterContent = await callLLM(chapterPrompt, 2200);
      markdown += `## \( {ch.title}\n\n \){chapterContent}\n\n`;
    }

    // Closing
    const closingPrompt = `Write a powerful 300–500 word closing / call-to-action for "${title} – ${subtitle}". Inspire long-term commitment. Tone: ${tone}.`;
    markdown += `## Final Thoughts\n\n${await callLLM(closingPrompt, 1000)}\n\n`;

    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const pagesEstimate = Math.ceil(wordCount / 450);

    // Save
    const jobId = uuidv4();
    await supabase.from('ebooks').insert({
      id: jobId,
      title,
      subtitle,
      topic,
      tone,
      length,
      content: markdown,
      pages: pagesEstimate,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      jobId,
      title,
      subtitle,
      content: markdown,
      pages: pagesEstimate,
    });
  } catch (err: any) {
    console.error('Ebook generation failed:', err);
    return NextResponse.json(
      { error: err.message || 'Generation failed – please try again' },
      { status: 500 }
    );
  }
  }
