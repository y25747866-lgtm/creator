import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  validateEbookInput, 
  sanitizeInput, 
  verifyAccess, 
  errorResponse 
} from "../_shared/validation.ts";

interface LengthConfig {
  label: string;
  chapterCount: string;
  chaptersNum: number;
  wordTarget: string;
  pageTarget: string;
  maxTokens: number;
}

const LENGTH_CONFIGS: Record<string, LengthConfig> = {
  short: {
    label: "Short",
    chapterCount: "5-7",
    chaptersNum: 6,
    wordTarget: "4000-6000",
    pageTarget: "10-15",
    maxTokens: 8000,
  },
  medium: {
    label: "Medium",
    chapterCount: "8-12",
    chaptersNum: 10,
    wordTarget: "10000-15000",
    pageTarget: "20-30",
    maxTokens: 16000,
  },
  long: {
    label: "Long",
    chapterCount: "14-18",
    chaptersNum: 16,
    wordTarget: "20000-25000",
    pageTarget: "40-50",
    maxTokens: 16000,
  },
};

function getSystemPrompt(config: LengthConfig): string {
  return `You are an elite AI ebook creation engine designed to generate premium, sellable digital products automatically.

The ebook must feel like a premium product worth $19–$49.

WRITING QUALITY RULES:
- Feel written by an expert — NOT AI-generated
- Do NOT repeat unnecessarily
- Do NOT include fluff or filler
- Provide real, actionable value
- Be clear, modern, and engaging
- Write with genuine emotion, personal anecdotes, and relatable stories
- Use conversational yet polished language — accessible but never dumbed down
- Include metaphors, vivid imagery, and sensory details
- Vary sentence length for rhythm — short punchy lines mixed with flowing paragraphs
- Address the reader directly with "you" — make them feel seen
- Share vulnerable moments and honest reflections
- End chapters with reflection questions or powerful takeaways

FORMATTING:
- Use "# " for the ebook title
- Use "## " for chapter titles
- Use "### " for major section headings within chapters
- Use "#### " for sub-sections
- Write full, rich paragraphs (4-8 sentences each)
- Target ${config.chapterCount} chapters total
- Each chapter must have substantive, detailed content
- Target ${config.wordTarget} words total

STRUCTURE:
- Opening chapter that hooks emotionally — tell a story, paint a picture
- Each chapter builds on the last like a journey
- Include real-world examples, case studies, step-by-step guides
- Mix theory with practical application
- Include actionable steps, examples, and explanations
- Closing chapter with emotional resonance and clear next steps

SALES OPTIMIZATION:
- The ebook must feel like a Gumroad / Whop premium digital product
- Something people would pay money for
- Professional, structured, and high-value

CRITICAL: Write the COMPLETE content. Do NOT summarize or skip sections. Every chapter must be fully written out with rich, detailed content. This is a real book, not an outline.`;
}

function getUserPrompt(
  title: string, 
  topic: string, 
  description: string, 
  config: LengthConfig,
  category: string,
  targetAudience: string,
  tone: string
): string {
  return `Generate a complete, publication-ready premium ebook.

INPUTS:
- Category: ${category || "General"}
- Topic: "${topic}"
- Title: "${title}"
- Target Audience: ${targetAudience || "General readers interested in this topic"}
- Tone: ${tone || "professional, educational"}
- Length: ${config.label} (${config.pageTarget} pages)
${description ? `- Author's Vision: "${description}"` : ""}

OUTPUT REQUIREMENTS:

1. Table of Contents — Generate ${config.chapterCount} structured chapters

2. Full Ebook Content including:
   - Introduction (hook emotionally)
   - ${config.chapterCount} Chapters with subsections
   - Actionable steps and examples in each chapter
   - Summary per chapter
   - Conclusion with clear next steps

3. Target ${config.wordTarget} words total

Content must be: original, high quality, professional, valuable, clear, structured, engaging.

Do NOT include author name.
Do NOT include irrelevant content.
Title and content must match the category and topic automatically.
Everything must be consistent.

Begin writing the complete ebook now. Start with "# ${title}" followed by a subtitle, then "## Introduction" and write every word.`;
}

async function generateContent(
  apiKey: string,
  title: string,
  topic: string,
  description: string,
  config: LengthConfig,
  category: string,
  targetAudience: string,
  tone: string
): Promise<string> {
  // For long books, generate in parts
  if (config.label === "Long") {
    return await generateLongContent(apiKey, title, topic, description, config, category, targetAudience, tone);
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://nexoraos.lovable.app",
      "X-Title": "NexoraOS",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: getSystemPrompt(config) },
        { role: "user", content: getUserPrompt(title, topic, description, config, category, targetAudience, tone) },
      ],
      max_tokens: config.maxTokens,
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter error:", response.status, errorText);
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateLongContent(
  apiKey: string,
  title: string,
  topic: string,
  description: string,
  config: LengthConfig,
  category: string,
  targetAudience: string,
  tone: string
): Promise<string> {
  // Generate outline first
  const outlineResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://nexoraos.lovable.app",
      "X-Title": "NexoraOS",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: "You create detailed book outlines. Return ONLY a JSON array of chapter titles, e.g. [\"Introduction\", \"Chapter 1: ...\", ...]. No other text.",
        },
        {
          role: "user",
          content: `Create ${config.chaptersNum} chapter titles for an ebook titled "${title}" about "${topic}". ${description ? `Vision: "${description}".` : ""} Include Introduction and Conclusion. Return JSON array only.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!outlineResponse.ok) throw new Error("Failed to generate outline");

  const outlineData = await outlineResponse.json();
  const outlineText = outlineData.choices?.[0]?.message?.content?.trim() || "";
  
  let chapters: string[];
  try {
    chapters = JSON.parse(outlineText);
  } catch {
    // Fallback chapters
    chapters = [
      "Introduction",
      "Chapter 1: Understanding the Fundamentals",
      "Chapter 2: The Foundation",
      "Chapter 3: Core Strategies",
      "Chapter 4: Building Momentum",
      "Chapter 5: Advanced Techniques",
      "Chapter 6: Overcoming Obstacles",
      "Chapter 7: Real-World Applications",
      "Chapter 8: Scaling Your Success",
      "Chapter 9: The Mindset Shift",
      "Chapter 10: Putting It All Together",
      "Conclusion",
    ];
  }

  // Generate content in 2-3 batches
  const batchSize = Math.ceil(chapters.length / 3);
  const batches: string[][] = [];
  for (let i = 0; i < chapters.length; i += batchSize) {
    batches.push(chapters.slice(i, i + batchSize));
  }

  let fullContent = "";

  for (const batch of batches) {
    const batchPrompt = `Continue writing the ebook "${title}" about "${topic}".
    
Write the following chapters in full detail (1500-2000 words each):
${batch.map((ch) => `- ${ch}`).join("\n")}

${fullContent ? "Previous content ended with the last chapter. Continue seamlessly." : "Start with the first chapter."}

Write complete, emotionally engaging content. Use "# " for chapter titles, "## " for sections. Do NOT summarize.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexoraos.lovable.app",
        "X-Title": "NexoraOS",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: getSystemPrompt(config) },
          { role: "user", content: batchPrompt },
        ],
        max_tokens: config.maxTokens,
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      console.error("Batch generation failed:", response.status);
      continue;
    }

    const data = await response.json();
    const batchContent = data.choices?.[0]?.message?.content || "";
    fullContent += (fullContent ? "\n\n" : "") + batchContent;
  }

  return fullContent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await verifyAccess(req);
    if (!access.authorized) {
      return errorResponse(access.error || "Unauthorized", 401);
    }

    let body: { topic?: string; title?: string; description?: string; length?: string; category?: string; targetAudience?: string; tone?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body");
    }

    const { topic, title, description = "", length = "medium", category = "", targetAudience = "", tone = "" } = body;

    const validation = validateEbookInput(topic, title);
    if (!validation.valid) {
      return errorResponse(validation.error || "Invalid input");
    }

    const sanitizedTopic = sanitizeInput(topic!);
    const sanitizedTitle = title ? sanitizeInput(title).substring(0, 200) : sanitizedTopic;
    const sanitizedDescription = description ? sanitizeInput(description).substring(0, 500) : "";
    const sanitizedCategory = category ? sanitizeInput(category).substring(0, 100) : "";
    const sanitizedAudience = targetAudience ? sanitizeInput(targetAudience).substring(0, 200) : "";
    const sanitizedTone = tone ? sanitizeInput(tone).substring(0, 100) : "";
    const lengthKey = ["short", "medium", "long"].includes(length) ? length : "medium";
    const config = LENGTH_CONFIGS[lengthKey];

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) {
      console.log("No API key - generating fallback content");
      return new Response(
        JSON.stringify(generateFallbackContent(sanitizedTitle, sanitizedTopic)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${config.label} ebook for user ${access.userId}: "${sanitizedTitle}"`);

    const content = await generateContent(
      OPENROUTER_API_KEY,
      sanitizedTitle,
      sanitizedTopic,
      sanitizedDescription,
      config,
      sanitizedCategory,
      sanitizedAudience,
      sanitizedTone
    );

    if (!content || content.length < 500) {
      console.log("Content too short, using fallback");
      return new Response(
        JSON.stringify(generateFallbackContent(sanitizedTitle, sanitizedTopic)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pages = Math.max(
      parseInt(config.pageTarget.split("-")[0]),
      Math.ceil(content.split(/\s+/).length / 250)
    );

    console.log(`Generated ${content.length} chars, ~${pages} pages`);

    return new Response(
      JSON.stringify({ title: sanitizedTitle, content, pages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-ebook-content:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackContent(title: string, topic: string): { title: string; content: string; pages: number } {
  const safeTitle = title.replace(/[<>]/g, "");
  const safeTopic = topic.replace(/[<>]/g, "");

  const content = `# Introduction

Welcome to "${safeTitle}". This comprehensive guide will walk you through everything you need to know about ${safeTopic}.

In today's rapidly evolving world, understanding ${safeTopic} has become more important than ever. Whether you're a beginner just starting out or someone looking to deepen your knowledge, this ebook will provide you with valuable insights and practical strategies.

## What You'll Learn

Throughout this guide, you will discover:
- The fundamental concepts and principles of ${safeTopic}
- Practical strategies you can implement immediately
- Common mistakes to avoid and how to overcome challenges
- Expert tips and best practices from industry leaders

# Chapter 1: Understanding the Basics

Before diving deep into ${safeTopic}, it's essential to build a strong foundation. This chapter covers the core concepts that will serve as building blocks for your journey.

## Core Concepts

The first step in mastering ${safeTopic} is understanding its fundamental principles. These concepts form the backbone of everything else you'll learn in this guide.

### Getting Started

Every expert was once a beginner. The key is to start with the right mindset and approach. Focus on understanding the "why" behind each concept, not just the "how."

### Building Your Foundation

A solid foundation will help you progress faster and avoid common pitfalls. Take your time with this chapter and make sure you truly understand each concept before moving forward.

# Chapter 2: Practical Strategies

Now that you understand the basics, it's time to put that knowledge into action. This chapter provides step-by-step strategies you can implement right away.

## Strategy 1: Start Small

Don't try to do everything at once. Begin with one small step and build momentum from there.

## Strategy 2: Learn from Others

Find mentors, join communities, and learn from those who have already achieved what you're working toward.

## Strategy 3: Track Your Progress

What gets measured gets improved. Keep track of your progress and celebrate your wins.

# Conclusion

Congratulations on completing this guide! You now have a solid understanding of ${safeTopic} and practical strategies to implement what you've learned.

## Key Takeaways

1. Start with a strong foundation in the basics
2. Implement practical strategies consistently
3. Expect and prepare for challenges
4. Continue learning and growing

Remember: the best time to start was yesterday. The second best time is now.

---

*Generated by NexoraOS*
`;

  return { title: safeTitle, content, pages: 12 };
}
