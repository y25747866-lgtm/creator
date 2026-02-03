import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { title, subtitle } = req.body as { title: string; subtitle: string };

    // Clean premium cover (big centered title + subtitle below)
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <text x="300" y="380" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="bold" font-family="Arial, sans-serif">${title}</text>
  <text x="300" y="460" text-anchor="middle" fill="#e0e7ff" font-size="24" font-family="Arial, sans-serif">${subtitle}</text>
</svg>`;

    const base64 = btoa(unescape(encodeURIComponent(svg)));

    res.status(200).json({ imageUrl: `data:image/svg+xml;base64,${base64}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate cover' });
  }
}
