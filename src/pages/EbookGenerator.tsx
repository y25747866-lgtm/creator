import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { jsPDF } from "jspdf";

const EbookGenerator = () => {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("clear, authoritative, practical");
  const [ebookLength, setEbookLength] = useState<"short" | "medium" | "long">("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ebookData, setEbookData] = useState<any>(null);
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);

  const startGeneration = async () => {
    if (!topic.trim()) {
      toast({ title: "Topic Required", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setEbookData(null);

    try {
      const res = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, length: ebookLength }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to start generation");
      }

      const data = await res.json();

      const ebook: Ebook = {
        id: Date.now().toString(),
        title: data.title,
        topic,
        content: data.content,
        coverImageUrl: null, // add if you generate image
        pages: data.pages,
        createdAt: new Date().toISOString(),
      };
      addEbook(ebook);
      setEbookData(ebook);
      toast({ title: "Success", description: "Ebook generated!" });
    } catch (err: any) {
      setErrorMsg(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = (ebook: Ebook) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    // Simple PDF logic (expand as needed)
    doc.text(ebook.title, 20, 40);
    doc.text(ebook.content.substring(0, 500), 20, 60); // truncated for example

    doc.save(`${ebook.title}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <Card className="p-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-4">AI Ebook Generator</h1>
        <div className="space-y-4">
          <Input
            placeholder="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isGenerating}
          />
          <Input
            placeholder="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={isGenerating}
          />
          <select
            value={ebookLength}
            onChange={(e) => setEbookLength(e.target.value as "short" | "medium" | "long")}
            disabled={isGenerating}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
          <Button onClick={startGeneration} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Ebook"}
          </Button>
          {errorMsg && <p className="text-red-500">{errorMsg}</p>}
          {ebookData && (
            <div>
              <h2>{ebookData.title}</h2>
              <Button onClick={() => generatePDF(ebookData)}>Download PDF</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EbookGenerator;
