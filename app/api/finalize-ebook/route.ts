import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function buildFullMarkdown(job: any): string {
  let md = `# \( {job.title}\n\n \){job.subtitle}\n\n`;

  md += `By NexoraOS\n\n`;

  md += `## Table of Contents\n\n`;
  job.outline.forEach((ch: any) => {
    md += `- Chapter ${ch.number}: ${ch.title}\n`;
  });
  md += `\n\n`;

  job.content_parts.forEach((content: string, index: number) => {
    const ch = job.outline[index];
    md += `## Chapter ${ch.number}: \( {ch.title}\n\n \){content}\n\n`;
  });

  md += `## Final Thoughts\n\nThank you for reading. Apply what you learned.\n`;

  return md;
}

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();

  const { data: job } = await supabase
    .from("ebook_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job || job.status !== "complete") {
    return NextResponse.json({ error: "Job not complete" }, { status: 400 });
  }

  const finalMarkdown = buildFullMarkdown(job);

  // You can save it, email it, convert to PDF, etc.

  return NextResponse.json({
    success: true,
    finalMarkdown,
  });
}
