import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callLLM } from "@/lib/llm";

export const maxDuration = 300;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { jobId, chapterIndex } = await req.json();

    if (!jobId || typeof chapterIndex !== "number") {
      return NextResponse.json(
        { error: "jobId and chapterIndex are required" },
        { status: 400 }
      );
    }

    const { data: job, error } = await supabase
      .from("ebook_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const outline = job.outline || [];
    if (chapterIndex < 0 || chapterIndex >= outline.length) {
      return NextResponse.json({ error: "Invalid chapter index" }, { status: 400 });
    }

    const parts = job.content_parts || [];

    // Skip if already done
    if (parts[chapterIndex]) {
      return NextResponse.json({ success: true, alreadyGenerated: true });
    }

    const chapter = outline[chapterIndex];
    const prevSummary = parts
      .slice(0, chapterIndex)
      .map((c: string, i: number) => `Chapter ${i + 1}: ${outline[i].goal}`)
      .join(" ");

    const targetWords = chapter.estimated_words || 1000;

    const prompt = `
You are writing **Chapter ${chapter.number}** of the ebook

**${job.title} – ${job.subtitle}**

Tone: ${job.tone} — clear, confident, no fluff, human expert voice
Previous chapters summary: ${prevSummary || "This is the first chapter"}

Chapter title: ${chapter.title}
Main goal: ${chapter.goal}

Target length: \~${targetWords} words

Use **exactly** this structure with these headings:

## Hook
## The Current Reality
## The Framework
## Deep Explanation
## Real-World Examples
## Action Steps
## Identity Shift

Write clean markdown. Start directly with content. No meta comments.
`;

    const content = await callLLM(prompt, Math.min(3500, targetWords * 1.6));

    parts[chapterIndex] = content;

    const newProgress = parts.filter(Boolean).length;
    const newStatus =
      newProgress === job.total_chapters ? "complete" : "writing";

    await supabase
      .from("ebook_jobs")
      .update({
        content_parts: parts,
        progress: newProgress,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      chapterIndex,
      progress: newProgress,
      status: newStatus,
    });
  } catch (err: any) {
    console.error(err);
    await supabase
      .from("ebook_jobs")
      .update({
        status: "error",
        error_message: err.message?.slice(0, 500) || "Unknown error",
      })
      .eq("id", jobId);
    return NextResponse.json({ error: "Chapter generation failed" }, { status: 500 });
  }
    }
