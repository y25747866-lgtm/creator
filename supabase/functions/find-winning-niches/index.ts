import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  sanitizeInput, 
  verifyAuthOnly, 
  errorResponse 
} from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await verifyAuthOnly(req);
    if (!access.authorized) {
      return errorResponse(access.error || 'Authentication required', 401);
    }

    let body: { topic?: string; language?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body');
    }

    const { topic, language = "English" } = body;
    if (!topic) return errorResponse('Topic is required');
    
    const sanitizedTopic = sanitizeInput(topic);
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      // Fallback data if no API key
      return new Response(
        JSON.stringify({ 
          niches: [
            {
              id: "1", category: "HEALTH", subNiche: "Biohacking",
              headline: `The 7-Day ${sanitizedTopic} Optimization Protocol`,
              description: "Busy professionals are struggling with burnout. This angle focuses on rapid recovery through science-backed hacks.",
              pain: 9, demand: 8, speed: 10
            },
            {
              id: "2", category: "FINANCE", subNiche: "Micro-Investing",
              headline: `Passive Income for the $100 ${sanitizedTopic} Investor`,
              description: "With inflation rising, people want to start small. This guide simplifies complex concepts into actionable micro-steps.",
              pain: 8, demand: 9, speed: 7
            }
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a market research expert. The user has a broad idea: "${sanitizedTopic}".
Search for trending sub-niches and winning angles for this topic in ${language}.
Provide 6 distinct niche cards. Each card must include:
1. category: (e.g. HEALTH, FINANCE, PARENTING, BUSINESS, etc.)
2. subNiche: (A specific sub-category)
3. headline: (A bold problem-solving headline)
4. description: (2-line description of the pain)
5. pain: (Score 1-10)
6. demand: (Score 1-10)
7. speed: (Score 1-10)

Respond ONLY with a JSON array of 6 objects. No other text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a market research AI. Respond with JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    
    const data = await response.json();
    let niches;
    try {
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);
      niches = parsed.niches || parsed;
      if (!Array.isArray(niches)) niches = [niches];
      // Ensure IDs
      niches = niches.slice(0, 6).map((n: any, i: number) => ({ ...n, id: String(i + 1) }));
    } catch {
      throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({ niches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in find-winning-niches:', error);
    return errorResponse(error.message, 500);
  }
});
