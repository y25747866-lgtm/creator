import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title = 'Untitled Ebook', topic = 'General' } = req.body as { title?: string; topic?: string };

    // Pure, self-contained SVG (no external dependencies, always works)
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="wood" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5c3317"/>
      <stop offset="100%" stop-color="#3d1f0f"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="15" result="blur"/>
      <feFlood flood-color="#fbbf24" flood-opacity="0.8"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Wooden table background -->
  <rect width="600" height="900" fill="url(#wood)"/>
  <!-- Glowing open book -->
  <g filter="url(#glow)">
    <path d="M150 400 Q300 250 450 400 L450 700 Q300 650 150 700 Z" fill="#f3f4f6"/>
    <path d="M300 250 L300 650" stroke="#fbbf24" stroke-width="20"/>
  </g>
  <!-- Light rays -->
  <circle cx="300" cy="450" r="250" fill="none" stroke="#fbbf24" stroke-width="10" opacity="0.4"/>
  <!-- Glasses -->
  <circle cx="200" cy="600" r="35" fill="none" stroke="#000" stroke-width="8"/>
  <circle cx="400" cy="600" r="35" fill="none" stroke="#000" stroke-width="8"/>
  <line x1="235" y1="600" x2="365" y2="600" stroke="#000" stroke-width="8"/>
  <!-- Pen -->
  <rect x="350" y="650" width="120" height="20" rx="10" fill="#1e40af" transform="rotate(-30 350 650)"/>
  <!-- Coffee cup -->
  <rect x="100" y="620" width="90" height="110" rx="15" fill="#fff"/>
  <rect x="100" y="620" width="90" height="70" fill="#4b2e0b"/>
  <ellipse cx="145" cy="620" rx="45" ry="15" fill="#fff"/>
  <!-- Big title on top (fits perfectly) -->
  <text x="300" y="140" text-anchor="middle" fill="#fbbf24" font-size="50" font-weight="bold" font-family="serif">${title}</text>
  <!-- Subtitle -->
  <text x="300" y="220" text-anchor="middle" fill="#e2e8f0" font-size="28" font-family="serif">${topic}</text>
  <!-- Author -->
  <text x="300" y="840" text-anchor="middle" fill="#94a3b8" font-size="20">NexoraOS by Yesh Malik</text>
</svg>`;

    // Category-specific elements
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('money') || lowerTopic.includes('wealth') || lowerTopic.includes('finance') || lowerTopic.includes('profit')) {
      svg = svg.replace('</svg>', `
  <!-- Gold coins & $ for money category -->
  <circle cx="100" cy="150" r="50" fill="#fbbf24"/>
  <circle cx="500" cy="150" r="50" fill="#fbbf24"/>
  <circle cx="150" cy="250" r="40" fill="#fbbf24"/>
  <circle cx="450" cy="250" r="40" fill="#fbbf24"/>
  <text x="300" y="700" text-anchor="middle" fill="#fbbf24" font-size="100">$</text>
</svg>`);
    } else if (lowerTopic.includes('love') || lowerTopic.includes('relationship')) {
      svg = svg.replace('</svg>', `
  <!-- Hearts for love category -->
  <path d="M300 150 Q260 100 220 150 Q180 200 220 250 Q260 300 300 250 Q340 300 380 250 Q420 200 380 150 Q340 100 300 150 Z" fill="#ef4444"/>
</svg>`);
    } // Add more categories later if needed

    // Encode to base64 data URL (safe, no external links)
    const base64 = btoa(unescape(encodeURIComponent(svg)));

    res.status(200).json({
      imageUrl: `data:image/svg+xml;base64,${base64}`
    });
  } catch (error) {
    console.error('Cover generation error:', error);
    res.status(500).json({ error: 'Failed to generate cover' });
  }
}
