import { useState } from "react";

export default function Index() {
  const [title, setTitle] = useState("AI Business Blueprint");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    try {
      setLoading(true);
      setPdfUrl(null);
      setImageUrl(null);

      // ---- 1️⃣ Generate ebook content ----
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

      // Convert text to downloadable PDF-like file (browser-safe)
      const pdfBlob = new Blob([contentData.content], {
        type: "application/pdf",
      });
      const pdfObjectUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(pdfObjectUrl);

      // ---- 2️⃣ Generate cover ----
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

      setImageUrl(coverData.imageUrl);
    } catch (err) {
      console.error("❌ Generation failed:", err);
      alert("Generation failed. Open console.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadCover() {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${title}-cover.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Ebook Generator</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ padding: 10, width: "100%", marginBottom: 10 }}
      />

      <button onClick={generate} disabled={loading}>
        {loading ? "Generating..." : "Generate Ebook"}
      </button>

      {pdfUrl && (
        <div style={{ marginTop: 20 }}>
          <button onClick={downloadPDF}>⬇️ Download Ebook</button>
        </div>
      )}

      {imageUrl && (
        <div style={{ marginTop: 20 }}>
          <img src={imageUrl} width={200} />
          <br />
          <button onClick={downloadCover}>⬇️ Download Cover</button>
        </div>
      )}
    </div>
  );
    }
