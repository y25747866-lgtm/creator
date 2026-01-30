import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, Download, Image as ImageIcon } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { jsPDF } from "jspdf";

const EbookGenerator = () => {
  const [topic, setTopic] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [ebookLength, setEbookLength] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [generatedEbook, setGeneratedEbook] = useState<Ebook | null>(null);
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);

  useEffect(() => {
    if (topic.length > 3) {
      const timeout = setTimeout(() => {
        generateTitle(topic);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setGeneratedTitle("");
    }
  }, [topic]);

  const generateTitle = async (topicText: string) => {
    try {
      const res = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicText }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.title) setGeneratedTitle(data.title);
    } catch (error) {
      console.error("Title generation failed:", error);
    }
  };

  const generateEbook = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your ebook.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatus("Starting generation...");
    setGeneratedEbook(null);

    try {
      setProgress(30);
      setStatus("Creating title...");

      setProgress(50);
      setStatus(
        ebookLength === "long"
          ? "Writing full ebook... (this may take 1-2 minutes for 40-50 pages)"
          : "Generating ebook content..."
      );

      const contentRes = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          title: generatedTitle || topic,
          length: ebookLength,
        }),
      });

      if (!contentRes.ok) {
        const errText = await contentRes.text();
        throw new Error(errText || "Failed to generate content");
      }

      const contentData = await contentRes.json();

      setProgress(80);
      setStatus("Designing beautiful cover...");

      const coverRes = await fetch("/api/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: generatedTitle || topic, topic }),
      });

      if (!coverRes.ok) throw new Error("Failed to generate cover");

      const coverData = await coverRes.json();

      setProgress(100);
      setStatus("Your ebook is ready!");

      const ebook: Ebook = {
        id: crypto.randomUUID(),
        title: generatedTitle || topic,
        topic,
        content: contentData.content,
        coverImageUrl: coverData.imageUrl,
        pages: contentData.pages,
        createdAt: new Date().toISOString(),
      };

      addEbook(ebook);
      setGeneratedEbook(ebook);

      toast({
        title: "Success!",
        description: `Your ~${ebook.pages}-page ebook is ready!`,
      });
    } catch (error: unknown) {
      console.error("Generation error:", error);
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = (ebook: Ebook) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Page 1: Cover (text fallback)
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setFontSize(40);
    doc.setTextColor(251, 191, 36);
    doc.text(ebook.title, pageWidth / 2, pageHeight / 2 - 50, { align: "center" });
    doc.setFontSize(20);
    doc.setTextColor(226, 232, 240);
    doc.text(ebook.topic, pageWidth / 2, pageHeight / 2 + 20, { align: "center" });
    doc.setFontSize(16);
    doc.text("NexoraOS by Yesh Malik", pageWidth / 2, pageHeight - 50, { align: "center" });

    // Content from page 2
    doc.addPage();
    let y = 20;
    const lines = ebook.content.split("\n");
    for (let line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      if (line.startsWith("# ")) {
        doc.setFontSize(24);
        doc.text(line.slice(2), 20, y);
        y += 30;
      } else if (line.startsWith("## ")) {
        doc.setFontSize(18);
        doc.text(line.slice(3), 20, y);
        y += 25;
      } else if (line) {
        doc.setFontSize(12);
        const split = doc.splitTextToSize(line, pageWidth - 40);
        doc.text(split, 20, y);
        y += split.length * 8;
      } else {
        y += 10;
      }
    }

    doc.save(`${ebook.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  const downloadCoverImage = (ebook: Ebook) => {
    if (!ebook.coverImageUrl) {
      toast({ title: "No cover available", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = ebook.coverImageUrl;
    a.download = `${ebook.title.replace(/[^a-zA-Z0-9]/g, "_")}_cover.svg`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">AI Ebook Generator</h1>
          <p className="text-muted-foreground">Create a real, full ebook.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <Input
                  placeholder="e.g., Money making"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                  className="text-lg py-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Length</label>
                <select
                  value={ebookLength}
                  onChange={(e) => setEbookLength(e.target.value)}
                  className="w-full p-3 rounded-md border border-input bg-background"
                  disabled={isGenerating}
                >
                  <option value="short">Short (5-10 pages)</option>
                  <option value="medium">Medium (15-25 pages)</option>
                  <option value="long">Long (40-50 pages)</option>
                </select>
              </div>

              {generatedTitle && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <div className="flex items-center gap-2 text-sm text-primary mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Generated Title</span>
                  </div>
                  <p className="font-semibold text-lg">{generatedTitle}</p>
                </motion.div>
              )}

              {isGenerating && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{status}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={generateEbook}
                disabled={isGenerating || !topic.trim()}
                className="w-full py-6 text-lg font-medium"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5 mr-2" />
                    Generate Ebook
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        {generatedEbook && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8">
              <h2 className="text-xl font-semibold mb-6">Your Ebook is Ready!</h2>

              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-48 shrink-0">
                  {generatedEbook.coverImageUrl ? (
                    <img
                      src={generatedEbook.coverImageUrl}
                      alt={generatedEbook.title}
                      className="w-full rounded-lg shadow-lg object-cover aspect-[3/4]"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center p-4 text-center">
                      <span className="text-white font-semibold">
                        {generatedEbook.title}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="text-2xl font-bold">{generatedEbook.title}</h3>
                  <p className="text-muted-foreground">
                    Topic: {generatedEbook.topic}
                  </p>
                  <p className="text-muted-foreground">
                    Pages: ~{generatedEbook.pages}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button onClick={() => generatePDF(generatedEbook)} className="flex-1 min-w-[150px]">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadCoverImage(generatedEbook)}
                      className="flex-1 min-w-[150px]"
                      disabled={!generatedEbook.coverImageUrl}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Download Cover
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
