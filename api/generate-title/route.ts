import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callLLM } from "@/lib/llm"; // ← assuming you have this shared LLM helper

export const maxDuration = 60; // safe for Hobby plan (can increase to 300 with Fluid)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      tone = "clear, authoritative, practical",
      jobId, // optional – if provided, save to Supabase job
    } = body;

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "topic is required" },
        { status: 400 }
      );
    }

    const prompt = `
You are a world-class nonfiction book title strategist (think Tim Ferriss, James Clear, Ramit Sethi level publishers).

Topic: ${topic}
Tone / voice: ${tone}

Create ONE extremely high-conversion, authority-building title + subtitle combination.

Rules – strict:
- Title: 4–9 words max, curiosity + benefit + specificity
- Subtitle: explains the transformation / outcome + includes 1–2 searchable keywords
- Use power words where natural (Ultimate, Proven, Simple, Fast, Blueprint, Secrets, etc.)
- Avoid clickbait or unrealistic promises
- Sound professional and premium
- Output **ONLY** valid JSON – nothing else before or after

{
  "title": "Main Title Here",
  "subtitle": "Subtitle That Promises Clear Transformation and Keywords"
}
    `.trim();

    const rawResponse = await callLLM(prompt, 400);

    let titleData: { title: string; subtitle: string };
    try {
      titleData = JSON.parse(rawResponse);
    } catch (parseErr) {
      console.error("Title JSON parse failed:", parseErr, rawResponse);
      titleData = {
        title: `Mastering ${topic}`,
        subtitle: `A Practical, Step-by-Step Guide to Real Results`,
      };
    }

    const { title, subtitle } = titleData;

    // Optional: save to job if jobId provided
    if (jobId) {
      const { error } = await supabase
        .from("ebook_jobs")
        .update({
          title,
          subtitle,
          status: "title_done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) {
        console.error("Supabase update error:", error);
        // continue anyway – don't fail the whole request
      }
    }

    return NextResponse.json({
      success: true,
      title: title.trim(),
      subtitle: subtitle.trim(),
    });
  } catch (err: any) {
    console.error("generate-title error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate title" },
      { status: 500 }
    );
  }
      }
