import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, title } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log('Generating content for:', title);

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
          {
            role: 'system',
            content: `You are an expert ebook writer. Write comprehensive, well-structured ebook content. 
            
Format your response with:
- Use "# " for chapter titles
- Use "## " for section headings
- Use "### " for sub-sections
- Write detailed, valuable content in each section
- Include an introduction and conclusion
- Make content actionable and practical

Write at least 3000 words of high-quality content.`
          },
          {
            role: 'user',
            content: `Write a complete ebook titled "${title}" about "${topic}". 

Structure:
1. Introduction - Hook the reader and explain what they'll learn
2. 5-7 main chapters with detailed content
3. Practical tips and actionable advice throughout
4. Conclusion with key takeaways

Make it comprehensive, valuable, and professionally written.`
          }
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const pages = Math.ceil(content.length / 2500);

    console.log('Generated content length:', content.length, 'Estimated pages:', pages);

    return new Response(
      JSON.stringify({ 
        title,
        content,
        pages 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-ebook-content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
