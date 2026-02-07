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
  // ────────────────────────────────────────────────
  // DEBUG: Check if environment variables are actually available
  console.log("Env check:", {
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    openRouterLength: process.env.OPENROUTER_API_KEY?.length || 0,
    supabaseUrl: process.env.SUPABASE_URL || "(missing)",
  });
  // ────────────────────────────────────────────────

  try {
    const body = await req.json();
    const { topic, tone = "clear, authoritative, practical", length = "medium" } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    // Create job record
    const jobId = uuidv4();

    await supabase.from("ebook_jobs").insert({
      id: jobId,
      topic,
      tone,
      length,
      status: "pending",
    });

    // ─── Generate title ───────────────────────────────────────────────────────
    const titlePrompt = `
You are a world-class nonfiction book title strategist.

Topic: ${topic}
Tone: ${tone}

Create ONE high-conversion title + subtitle.
Output ONLY valid JSON:
{"title":"...", "subtitle":"..."}
    `.trim();

    const titleRaw = await callLLM(titlePrompt, 400);
    let titleData: { title: string; subtitle: string };

    try {
      titleData = JSON.parse(titleRaw);
    } catch (parseErr) {
      console.error("Title JSON parse failed:", titleRaw, parseErr);
      titleData = {
        title: `Mastering ${topic}`,
        subtitle: "A Practical Guide to Real Results",
      };
    }

    const { title, subtitle } = titleData;

    // ─── Generate outline ─────────────────────────────────────────────────────
    const totalChapters = length === "short" ? 3 : length === "long" ? 7 : 5;

    const outlinePrompt = `
Create a clear, logical outline for an ebook titled "${title}" – ${subtitle}
Topic: ${topic}
Tone: ${tone}
Length: \( {length} ( \){totalChapters} chapters)

Output ONLY a JSON array:
[
  {"number":1, "title":"Chapter Title", "goal":"What the reader achieves in this chapter"},
  ...
]
    `.trim();

    const outlineRaw = await callLLM(outlinePrompt, 800);
    let outline: any[] = [];

    try {
      outline = JSON.parse(outlineRaw);
    } catch (parseErr) {
      console.error("Outline JSON parse failed:", outlineRaw, parseErr);
      outline = Array.from({ length: totalChapters }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}`,
        goal: `Understand key aspect ${i + 1} of ${topic}`,
      }));
    }

    // Update job with title, subtitle, outline
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
    console.error("generate-ebook full error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start generation" },
      { status: 500 }
    );
  }
    }
