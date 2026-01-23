const BASE = "https://zprgfzoxlgaxbnnjvvir.supabase.co/functions/v1";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwcmdmem94bGdheGJubmp2dmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3Njg3NzksImV4cCI6MjA4MjM0NDc3OX0.UgZ-H3C80vZLmXwzKOiYYJpxWto39BzQuID7N0hp2Ts";

async function post(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const generateEbookTitle = (topic: string) =>
  post(`${BASE}/generate-ebook-title`, { topic });

export const generateEbookContent = (title: string) =>
  post(`${BASE}/generate-ebook-content`, { title });

export const generateEbookCover = (title: string) =>
  post(`${BASE}/generate-ebook-cover`, { title });
