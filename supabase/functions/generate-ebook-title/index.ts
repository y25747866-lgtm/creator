import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  validateEbookInput, 
  sanitizeInput, 
  verifyAccess, 
  errorResponse 
} from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication and subscription
    const access = await verifyAccess(req);
    if (!access.authorized) {
      return errorResponse(access.error || 'Unauthorized', 401);
    }

    // Parse and validate input
    let body: { topic?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body');
    }

    const { topic } = body;
    
    // Validate input
    const validation = validateEbookInput(topic);
    if (!validation.valid) {
      return errorResponse(validation.error || 'Invalid input');
    }

    // Sanitize input for AI prompt
    const sanitizedTopic = sanitizeInput(topic!);

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log('Generating title for topic:', sanitizedTopic.substring(0, 50) + '...');

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
            content: 'You are a professional book title generator. Generate compelling, marketable ebook titles. Respond with ONLY the title, nothing else. No quotes, no explanation.'
          },
          {
            role: 'user',
            content: `Generate a professional, compelling ebook title for this topic: "${sanitizedTopic}". The title should be catchy, marketable, and promise value to readers.`
          }
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim() || sanitizedTopic;

    console.log('Generated title successfully');

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-ebook-title:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
