import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { title, topic } = req.body as { title: string; topic: string };

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#3b82f6" />
    <stop offset="50%" stop-color="#a855f7" />
  </linearGradient>
  <rect width="600" height="900" fill="url(#gradient)" />
  <text x="300" y="300" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="bold" font-family="Arial, sans-serif">${title}</text>
  <text x="300" y="360" text-anchor="middle" fill="#e0e7ff" font-size="24" font-family="Arial, sans-serif">${topic}</text>
  <text x="300" y="800" text-anchor="middle" fill="#c4b5fd" font-size="20" font-family="Arial, sans-serif">NexoraOS</text>
</svg>`;

    const base64 = btoa(unescape(encodeURIComponent(svg)));

    res.status(200).json({ imageUrl: `data:image/svg+xml;base64,${base64}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
      }
