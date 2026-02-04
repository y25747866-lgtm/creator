export const runtime = "nodejs";

function buildSystemPrompt(title: string, topic: string) {
  return `
You are a professional nonfiction publishing engine.

You do NOT write blog posts.
You do NOT write motivational essays.
You write structured, commercial-grade ebooks like top Amazon nonfiction titles and Synthesise.ai.

════════════════════════════════════
BOOK STRUCTURE (MANDATORY)
════════════════════════════════════

1. Title Page
2. Copyright Page
3. Reader Promise Page
4. How To Use This Book
5. Table of Contents
6. Introduction (Problem → Cost → Solution → Outcome)
7. 8 Core Chapters
8. Final Action Plan
9. Summary
10. Brand Signature Page

════════════════════════════════════
CHAPTER FORMAT (MANDATORY)
════════════════════════════════════

Each chapter MUST contain:
1. Chapter Title
2. Core Problem Explanation
3. Mental Model / Framework
4. Step-by-Step Execution Guide
5. Examples
6. Common Mistakes
7. Tools / Checklists
8. Action Exercises
9. Chapter Summary

════════════════════════════════════
FORMAT RULES
════════════════════════════════════
- Markdown
- Short paragraphs
- Bullets
- Tables
- Diagrams when helpful
- No fluff
- No hype
- No motivation essays

════════════════════════════════════
BOOK DETAILS
════════════════════════════════════
Title: ${title}
Topic: ${topic}

════════════════════════════════════

Now generate the COMPLETE ebook in Markdown following ALL rules above.
`;
}

export async function POST(req: Request) {
  try {
    const { topic, title } = await req.json();
    if (!topic || !title) {
      return new Response(JSON.stringify({ error: "Missing topic or title" }), { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(title, topic);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.15,
        max_tokens: 14000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data = await response.json();
    const content = data.choices[0].message.content || "";
    const pages = Math.max(8, Math.round(content.split(" ").length / 350));

    return Response.json({ content, pages });
  } catch (err) {
    console.error("generate-ebook error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate ebook" }), { status: 500 });
  }
}
