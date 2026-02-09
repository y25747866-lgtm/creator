import { useState, useEffect } from "react";
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
        id: data.jobId,
        title: data.title,
        topic,
        content: data.content,
        coverImageUrl: null,
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

    // Simple example - expand with your full PDF logic
    doc.setFontSize(24);
    doc.text(ebook.title, 40, 60);
    doc.setFontSize(12);
    doc.text(ebook.content.substring(0, 500) + "...", 40, 100);

    doc.save(`${ebook.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-6 text-center">AI Ebook Generator</h1>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Create professional ebooks in minutes
          </p>
        </motion.div>

        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium mb-2">Topic</label>
              <Input
                placeholder="e.g., Money making"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                className="text-lg py-6"
              />
            </div>

            <div>
              <label className="block text-lg font-medium mb-2">Tone</label>
              <Input
                placeholder="clear, authoritative, practical"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-lg font-medium mb-2">Length</label>
              <select
                value={ebookLength}
                onChange={(e) => setEbookLength(e.target.value as "short" | "medium" | "long")}
                disabled={isGenerating}
                className="w-full p-4 rounded-md border bg-background text-lg"
              >
                <option value="short">Short (5-10 pages)</option>
                <option value="medium">Medium (15-25 pages)</option>
                <option value="long">Long (40-50 pages)</option>
              </select>
            </div>

            {isGenerating && (
              <div className="space-y-4">
                <Progress value={60} className="h-3" />
                <p className="text-center text-muted-foreground">Generating your ebook...</p>
              </div>
            )}

            {errorMsg && <p className="text-red-500 text-center">{errorMsg}</p>}

            <Button
              onClick={startGeneration}
              disabled={isGenerating || !topic.trim()}
              className="w-full py-8 text-xl font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="w-6 h-6 mr-3" />
                  Generate Ebook
                </>
              )}
            </Button>

            {ebookData && (
              <div className="mt-8 p-6 border rounded-lg bg-muted/50">
                <h2 className="text-2xl font-bold mb-4">{ebookData.title}</h2>
                <p className="text-muted-foreground mb-4">\~{ebookData.pages} pages</p>
                <Button onClick={() => generatePDF(ebookData)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EbookGenerator;
