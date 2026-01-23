export async function generateEbook(title: string) {
  const res = await fetch("https://zprgfzoxlgaxbnnjvvir.supabase.co/functions/v1/generate-ebook-content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title })
  });

  if (!res.ok) throw new Error("Generation failed");

  return res.json();
}
