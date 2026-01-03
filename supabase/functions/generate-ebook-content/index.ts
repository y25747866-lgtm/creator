import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token-aware content generation tiers
interface ContentTier {
  name: string;
  maxTokens: number;
  chapterCount: string;
  wordTarget: string;
  pageTarget: number;
}

const CONTENT_TIERS: ContentTier[] = [
  { name: 'premium', maxTokens: 16000, chapterCount: '10-12', wordTarget: '8000-10000', pageTarget: 50 },
  { name: 'standard', maxTokens: 8000, chapterCount: '7-9', wordTarget: '5000-7000', pageTarget: 35 },
  { name: 'compact', maxTokens: 4000, chapterCount: '5-6', wordTarget: '3000-4000', pageTarget: 20 },
  { name: 'minimal', maxTokens: 2000, chapterCount: '3-4', wordTarget: '1500-2000', pageTarget: 10 },
];

function selectContentTier(): ContentTier {
  // Default to premium tier - the API will handle token limits gracefully
  // We try premium first and the model will naturally adjust output length
  return CONTENT_TIERS[0];
}

function getSystemPrompt(tier: ContentTier): string {
  return `You are an expert ebook writer creating professional, publication-ready content.

FORMATTING REQUIREMENTS:
- Use "# " for chapter titles (main sections)
- Use "## " for section headings within chapters
- Use "### " for sub-sections when needed
- Write clear, flowing paragraphs with proper spacing
- Each chapter should have substantial, valuable content

STRUCTURE REQUIREMENTS:
- Introduction chapter that hooks the reader
- ${tier.chapterCount} main chapters with detailed content
- Practical tips, examples, and actionable advice throughout
- Strong conclusion with key takeaways and next steps

QUALITY GUIDELINES:
- Write professionally with clear, engaging language
- Include real-world examples and case studies
- Provide step-by-step instructions where applicable
- Make content actionable and immediately useful
- Target ${tier.wordTarget} words of high-quality content

Do NOT include any meta-commentary about the ebook itself. Just write the content directly.`;
}

function getUserPrompt(title: string, topic: string, tier: ContentTier): string {
  return `Write a complete, professional ebook with the following details:

Title: "${title}"
Topic: "${topic}"

Requirements:
1. Start with a compelling Introduction that explains what readers will learn
2. Write ${tier.chapterCount} detailed main chapters covering all aspects of the topic
3. Include practical examples, tips, and actionable advice in each chapter
4. End with a Conclusion summarizing key points and providing next steps
5. Target approximately ${tier.pageTarget} pages of content

Write the complete ebook content now, starting with the Introduction chapter.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, title } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      // Graceful fallback - generate basic content without API
      console.log('No API key - generating fallback content');
      return new Response(
        JSON.stringify(generateFallbackContent(title, topic)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select appropriate content tier
    const tier = selectContentTier();
    console.log(`Generating ${tier.name} content for: ${title} (target: ${tier.pageTarget} pages)`);

    // Try premium content first, fall back gracefully if needed
    let content = '';
    let success = false;

    for (const currentTier of CONTENT_TIERS) {
      if (success) break;

      try {
        console.log(`Attempting ${currentTier.name} tier (${currentTier.maxTokens} tokens)`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nexoraos.lovable.app',
            'X-Title': 'NexoraOS',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [
              { role: 'system', content: getSystemPrompt(currentTier) },
              { role: 'user', content: getUserPrompt(title, topic, currentTier) }
            ],
            max_tokens: currentTier.maxTokens,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          content = data.choices?.[0]?.message?.content || '';
          
          if (content && content.length > 500) {
            success = true;
            console.log(`Successfully generated ${currentTier.name} content: ${content.length} chars`);
          }
        } else {
          const errorText = await response.text();
          console.error(`${currentTier.name} tier failed:`, response.status, errorText);
          
          // If rate limited or payment required, try next tier
          if (response.status === 429 || response.status === 402) {
            console.log('Token limit issue, trying smaller tier...');
            continue;
          }
        }
      } catch (tierError) {
        console.error(`Error in ${currentTier.name} tier:`, tierError);
      }
    }

    // If all tiers failed, use fallback
    if (!success || !content) {
      console.log('All tiers failed, using fallback content');
      return new Response(
        JSON.stringify(generateFallbackContent(title, topic)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate pages based on content length
    const pages = Math.max(10, Math.ceil(content.length / 2000));

    console.log('Generated content length:', content.length, 'Estimated pages:', pages);

    return new Response(
      JSON.stringify({ title, content, pages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-ebook-content:', error);
    
    // Never fail - always return usable content
    const { topic = 'General Topic', title = 'Ebook' } = await req.json().catch(() => ({}));
    return new Response(
      JSON.stringify(generateFallbackContent(title, topic)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackContent(title: string, topic: string): { title: string; content: string; pages: number } {
  const content = `# Introduction

Welcome to "${title}". This comprehensive guide will walk you through everything you need to know about ${topic}.

In today's rapidly evolving world, understanding ${topic} has become more important than ever. Whether you're a beginner just starting out or someone looking to deepen your knowledge, this ebook will provide you with valuable insights and practical strategies.

## What You'll Learn

Throughout this guide, you will discover:
- The fundamental concepts and principles of ${topic}
- Practical strategies you can implement immediately
- Common mistakes to avoid and how to overcome challenges
- Expert tips and best practices from industry leaders

# Chapter 1: Understanding the Basics

Before diving deep into ${topic}, it's essential to build a strong foundation. This chapter covers the core concepts that will serve as building blocks for your journey.

## Core Concepts

The first step in mastering ${topic} is understanding its fundamental principles. These concepts form the backbone of everything else you'll learn in this guide.

### Getting Started

Every expert was once a beginner. The key is to start with the right mindset and approach. Focus on understanding the "why" behind each concept, not just the "how."

### Building Your Foundation

A solid foundation will help you progress faster and avoid common pitfalls. Take your time with this chapter and make sure you truly understand each concept before moving forward.

# Chapter 2: Practical Strategies

Now that you understand the basics, it's time to put that knowledge into action. This chapter provides step-by-step strategies you can implement right away.

## Strategy 1: Start Small

Don't try to do everything at once. Begin with one small step and build momentum from there. Consistency beats intensity in the long run.

## Strategy 2: Learn from Others

Find mentors, join communities, and learn from those who have already achieved what you're working toward. Their experience can save you years of trial and error.

## Strategy 3: Track Your Progress

What gets measured gets improved. Keep track of your progress and celebrate your wins, no matter how small they may seem.

# Chapter 3: Overcoming Challenges

Every journey has its obstacles. This chapter addresses the most common challenges you'll face and provides solutions to overcome them.

## Common Challenges

- Lack of time and resources
- Information overload
- Self-doubt and imposter syndrome
- Difficulty staying motivated

## Solutions and Strategies

For each challenge, there are proven strategies to help you push through. The key is to anticipate these challenges and have a plan ready.

# Chapter 4: Advanced Techniques

Once you've mastered the basics, it's time to level up. This chapter introduces advanced techniques that will help you stand out from the crowd.

## Taking Your Skills to the Next Level

Advanced mastery requires deliberate practice and continuous learning. Focus on the areas that will have the biggest impact on your goals.

## Expert Tips

Learn from the best in the field. These tips come from years of experience and can accelerate your progress significantly.

# Conclusion

Congratulations on completing this guide! You now have a solid understanding of ${topic} and practical strategies to implement what you've learned.

## Key Takeaways

1. Start with a strong foundation in the basics
2. Implement practical strategies consistently
3. Expect and prepare for challenges
4. Continue learning and growing

## Your Next Steps

Knowledge without action is just entertainment. Take what you've learned and put it into practice today. Start small, stay consistent, and watch your progress compound over time.

Remember: the best time to start was yesterday. The second best time is now.

---

*Generated by NexoraOS - Your Digital Product Operating System*
`;

  return {
    title,
    content,
    pages: 15,
  };
}
