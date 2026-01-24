import { useState } from "react";

export default function Index() {
  const [loading, setLoading] = useState(false);

  async function generateEbook() {
    try {
      setLoading(true);

      const title = "AI Business Blueprint";

      // 1️⃣ Get ebook content
      const contentRes = await fetch(
        "https://zprgfzoxlgaxbnnjvvir.supabase.co/functions/v1/generate-ebook-content",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }
      );

      const contentData = await contentRes.json();
      if (!contentRes.ok) throw new Error(contentData.error);

      // 2️⃣ Get cover image
      const coverRes = await fetch(
        "https://zprgfzoxlgaxbnnjvvir.supabase.co/functions/v1/generate-ebook-cover",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }
      );

      const coverData = await coverRes.json();
      if (!coverRes.ok) throw new Error(coverData.error);

      // 3️⃣ Download ebook (mobile-safe)
      const ebookBlob = new Blob([contentData.content], { type: "text/plain" });
      const ebookUrl = URL.createObjectURL(ebookBlob);
      window.open(ebookUrl, "_blank");

      // 4️⃣ Download cover (mobile-safe)
      window.open(coverData.imageUrl, "_blank");

      alert("✅ Ebook and cover opened. Use your browser download button.");
    } catch (err) {
      console.error("❌ Generation failed:", err);
      alert("Generation failed. Check console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Ebook Generator</h1>
      <button
        onClick={generateEbook}
        disabled={loading}
        style={{ padding: 12, fontSize: 16 }}
      >
        {loading ? "Generating..." : "Generate Ebook"}
      </button>
    </div>
  );
}
