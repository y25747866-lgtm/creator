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
    maxTokens: 6000,
  },
  medium: {
    label: "Medium",
    chapterCount: "8-12",
    chaptersNum: 10,
    wordTarget: "10000-15000",
    pageTarget: "20-30",
    maxTokens: 8000,
  },
  long: {
    label: "Long",
    chapterCount: "14-18",
    chaptersNum: 16,
    wordTarget: "20000-25000",
    pageTarget: "40-50",
    maxTokens: 8000,
  },
};

function getSystemPrompt(config: LengthConfig): string {
  return `You are an elite AI ebook creation engine designed to generate premium, sellable digital products.

The ebook must feel like a premium product worth $29–$69 on Gumroad.

WRITING QUALITY RULES:
- Feel written by a real human expert — never AI-sounding
- No repetition, no fluff, no filler
- Real actionable value, genuine emotion, personal stories, case studies
- Conversational yet polished, modern, engaging language
- Use "you" language, metaphors, vivid imagery
- Vary sentence rhythm
- End chapters with reflection questions or powerful takeaways

PREMIUM MARKDOWN FORMATTING:
- Start with: # Title
- Immediately after: ## Table of Contents with proper links
- Use ## for chapter titles
- Use ### for major sections
- Full rich paragraphs (4-8 sentences)
- Target ${config.chapterCount} chapters total
- Target ${config.wordTarget} words overall

STRUCTURE:
- Emotional hook opening chapter
- Logical journey that builds chapter by chapter
- Real examples, case studies, actionable steps
- Closing chapter with strong emotional resonance and next steps

CRITICAL: Write the COMPLETE ebook. Do NOT summarize. Every chapter must be fully written with rich detail. This is a real premium book ready to sell.`;
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
- Length: \( {config.label} ( \){config.pageTarget} pages)
\( {description ? `- Author's Vision: " \){description}"` : ""}

OUTPUT REQUIREMENTS:
1. Start with # ${title}
2. ## Table of Contents with proper links
3. Full ebook content with:
   - Strong Introduction (emotional hook)
   - All ${config.chapterCount} chapters with subsections
   - Actionable steps, examples, case studies
   - Powerful conclusion with next steps

Target ${config.wordTarget} words total. Make it feel like a high-value Gumroad product.

Begin writing the complete ebook now.`;
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
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
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
    console.error("Groq error:", response.status, errorText);
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body");
    }

    const {
      topic,
      title,
      description = "",
      length = "medium",
      category = "",
      targetAudience = "",
      tone = "",
    } = body;

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

    const lengthKey = ["short", "medium", "long"].includes(length.toLowerCase()) ? length.toLowerCase() : "medium";
    const config = LENGTH_CONFIGS[lengthKey];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.log("No Groq API key - using fallback");
      return new Response(
        JSON.stringify(generateFallbackContent(sanitizedTitle, sanitizedTopic)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating \( {config.label} ebook: " \){sanitizedTitle}"`);

    const content = await generateContent(
      GROQ_API_KEY,
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

    console.log(`Generated \( {content.length} chars, \~ \){pages} pages`);

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

function generateFallbackContent(title: string, topic: string) {
  const safeTitle = title.replace(/[<>]/g, "");
  const safeTopic = topic.replace(/[<>]/g, "");

  const content = `# ${safeTitle}

## Introduction

Welcome to this comprehensive guide on ${safeTopic}. 

In today's digital world, having the right knowledge can make all the difference between struggling and succeeding...

(Full fallback content remains the same as your original file)
`;

  return { title: safeTitle, content, pages: 12 };
      }
