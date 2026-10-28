import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  validateEbookInput, 
  sanitizeInput, 
  verifyAuthOnly, 
  errorResponse,
  checkRateLimit,
  validateAndSanitize
} from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await verifyAuthOnly(req);
    if (!access.authorized || !access.userId) {
      return errorResponse(access.error || 'Authentication required', 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting
    const rateLimit = await checkRateLimit(supabase, access.userId);
    if (!rateLimit.allowed) {
      return errorResponse(rateLimit.error!, 429);
    }

    // Parse and validate input
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body');
    }

    // Input validation & sanitization
    const topic = validateAndSanitize(body.topic, 500);
    
    // Validate input
    const validation = validateEbookInput(topic);
    if (!validation.valid) {
      return errorResponse(validation.error || 'Invalid input');
    }

    // Sanitize input for AI prompt
    const sanitizedTopic = topic;

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not configured, using fallback');
      return new Response(
        JSON.stringify({ title: `The Ultimate Guide to ${sanitizedTopic}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating title for topic:', sanitizedTopic.substring(0, 50) + '...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
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
      console.error('Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
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
    return errorResponse(message, 500);
  }
});
