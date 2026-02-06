import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { callLLM } from "@/lib/llm";

export const maxDuration = 300;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { topic, tone = "clear, authoritative, practical", length = "medium" } =
      await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const jobId = uuidv4();

    await supabase.from("ebook_jobs").insert({
      id: jobId,
      topic,
      tone,
      length,
      status: "pending",
    });

    // Generate title
    const titlePrompt = `
Create a strong, benefit-driven title + subtitle for an ebook on:
Topic: ${topic}
Tone: ${tone}

Output **only** valid JSON:
{"title": "...", "subtitle": "..."}
    `;
    const titleRaw = await callLLM(titlePrompt, 400);
    let titleData: { title: string; subtitle: string };
    try {
      titleData = JSON.parse(titleRaw);
    } catch {
      titleData = {
        title: `Mastering ${topic}`,
        subtitle: "A Practical Guide to Real Results",
      };
    }

    const { title, subtitle } = titleData;

    // Determine chapter count
    const totalChapters = length === "short" ? 3 : length === "long" ? 7 : 5;

    // Generate outline
    const outlinePrompt = `
Create a clear, logical outline for an ebook titled "${title}" – ${subtitle}
Topic: ${topic}
Tone: ${tone}
Length: \( {length} ( \){totalChapters} chapters)

Output **only** a JSON array:
[
  {"number":1, "title":"Chapter Title", "goal":"What the reader achieves in this chapter"},
  ...
]
    `;
    const outlineRaw = await callLLM(outlinePrompt, 800);
    let outline: any[] = [];
    try {
      outline = JSON.parse(outlineRaw);
    } catch {
      outline = Array.from({ length: totalChapters }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}`,
        goal: `Understand key aspect ${i + 1} of ${topic}`,
      }));
    }

    await supabase
      .from("ebook_jobs")
      .update({
        title,
        subtitle,
        outline,
        total_chapters: totalChapters,
        status: "outline_done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({
      jobId,
      title,
      subtitle,
      outline,
      totalChapters,
      status: "outline_done",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to start generation" },
      { status: 500 }
    );
  }
}
