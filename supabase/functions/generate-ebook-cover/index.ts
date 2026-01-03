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
    const { title, topic } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log('Generating cover for:', title);

    // Generate a cover description first
    const descResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            content: 'You generate short, vivid image prompts for ebook covers. Be concise and specific.'
          },
          {
            role: 'user',
            content: `Create a short image generation prompt for an ebook cover. Title: "${title}", Topic: "${topic}". 
            
Style: Professional, modern, clean design with abstract elements. Use gradients of indigo, violet, and deep blue. 
Include visual metaphors related to the topic. No text in the image.
Keep it under 50 words.`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!descResponse.ok) {
      console.error('Failed to generate cover description');
      // Return a placeholder gradient image
      return new Response(
        JSON.stringify({ 
          imageUrl: createGradientPlaceholder(title)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const descData = await descResponse.json();
    const imagePrompt = descData.choices?.[0]?.message?.content?.trim() || '';

    console.log('Image prompt:', imagePrompt);

    // Try to use an image generation model via OpenRouter
    // If not available, create a styled placeholder
    const imageUrl = createGradientPlaceholder(title);

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-ebook-cover:', error);
    return new Response(
      JSON.stringify({ 
        imageUrl: createGradientPlaceholder('Ebook')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createGradientPlaceholder(title: string): string {
  // Create an SVG-based cover
  const svg = `
    <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#7C3AED;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
        </linearGradient>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" mode="overlay" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect width="100%" height="100%" fill="url(#grad)" opacity="0.1" filter="url(#noise)"/>
      <circle cx="150" cy="200" r="120" fill="white" opacity="0.1"/>
      <circle cx="450" cy="600" r="180" fill="white" opacity="0.08"/>
      <text x="50%" y="45%" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle" opacity="0.95">${escapeXml(title.substring(0, 30))}</text>
      ${title.length > 30 ? `<text x="50%" y="52%" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle" opacity="0.95">${escapeXml(title.substring(30, 60))}</text>` : ''}
      <text x="50%" y="90%" font-family="system-ui, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.7">NexoraOS</text>
    </svg>
  `;
  
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
