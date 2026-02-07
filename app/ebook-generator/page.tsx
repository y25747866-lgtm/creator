"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, Download } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore } from "@/hooks/useEbookStore";
import { jsPDF } from "jspdf";

interface Ebook {
  id: string;
  title: string;
  topic: string;
  content: string;
  coverImageUrl: string | null;
  pages: number;
  createdAt: string;
}

interface StatusData {
  status: string;
  progress: number;
  totalChapters: number;
  finalMarkdown?: string;
  title?: string;
}

const EbookGenerator = () => {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("clear, authoritative, practical");
  const [ebookLength, setEbookLength] = useState<"short" | "medium" | "long">("medium");
  const [jobId, setJobId] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);

  const startGeneration = async () => {
    if (!topic.trim()) {
      toast({ title: "Topic Required", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setJobId(null);
    setStatusData(null);

    try {
      const res = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, length: ebookLength }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to start generation");
      }

      const data = await res.json();
      setJobId(data.jobId);
      toast({ title: "Started", description: "Generation in progress..." });
    } catch (err: any) {
      setErrorMsg(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ebook-status?jobId=${jobId}`);
        if (!res.ok) throw new Error("Status fetch failed");

        const data = await res.json();
        setStatusData(data);

        if (data.status === "outline_done" && data.progress < data.totalChapters) {
          await fetch("/api/generate-chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, chapterIndex: data.progress }),
          });
        }

        if (data.status === "complete" && data.finalMarkdown) {
          const ebook: Ebook = {
            id: jobId,
            title: data.title ?? "Untitled",
            topic,
            content: data.finalMarkdown,
            coverImageUrl: null,
            pages: Math.ceil(data.finalMarkdown.split(/\s+/).length / 450),
            createdAt: new Date().toISOString(),
          };
          addEbook(ebook);
          toast({ title: "Success!", description: `Ebook ready (${ebook.pages} pages)` });
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId, topic, addEbook]);

  const isComplete = statusData?.status === "complete";
  const progressPercent = statusData?.totalChapters
    ? (statusData.progress / statusData.totalChapters) * 100
    : 0;

  const generatePDF = () => {
    if (!statusData?.finalMarkdown || !statusData?.title) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 60;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 18;
    let y = margin;

    doc.setFont("helvetica");

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.setTextColor(251, 191, 36);
    const titleLines = doc.splitTextToSize(statusData.title, maxWidth);
    doc.text(titleLines, pageWidth / 2, pageHeight / 2 - 80, { align: "center" });
    doc.setFontSize(24);
    doc.setTextColor(226, 232, 240);
    doc.text(topic, pageWidth / 2, pageHeight / 2 + 20, { align: "center" });
    doc.setFontSize(18);
    doc.text("NexoraOS", pageWidth / 2, pageHeight - 100, { align: "center" });

    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0);

    const lines = statusData.finalMarkdown.split("\n");
    for (let line of lines) {
      if (y > pageHeight - margin - 40) {
        doc.addPage();
        y = margin;
      }
      const trimmed = line.trim();
      if (!trimmed) {
        y += lineHeight;
        continue;
      }

      if (trimmed.startsWith("# ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text(trimmed.slice(2), margin, y);
        y += 35;
      } else if (trimmed.startsWith("## ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(trimmed.slice(3), margin, y);
        y += 28;
      } else {
        const wrapped = doc.splitTextToSize(trimmed, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * lineHeight;
      }
    }

    doc.save(`${statusData.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">AI Ebook Generator</h1>
          <p className="text-muted-foreground">Create a real, full ebook.</p>
        </motion.div>

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
              <label className="block text-sm font-medium mb-2">Tone</label>
              <Input
                placeholder="clear, authoritative, practical"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Length</label>
              <select
                value={ebookLength}
                onChange={(e) => setEbookLength(e.target.value as "short" | "medium" | "long")}
                className="w-full p-3 rounded-md border border-input bg-background"
                disabled={isGenerating}
              >
                <option value="short">Short (5-10 pages)</option>
                <option value="medium">Medium (15-25 pages)</option>
                <option value="long">Long (40-50 pages)</option>
              </select>
            </div>

            {titlePreview && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-primary mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Suggested Title</span>
                </div>
                <p className="font-semibold text-lg">{titlePreview}</p>
              </div>
            )}

            {isGenerating && statusData && (
              <div className="space-y-3">
                <Progress value={progressPercent} className="h-2" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {isComplete
                      ? "Done!"
                      : statusData.status?.includes("writing")
                      ? `Writing chapter ${statusData.progress + 1} of ${statusData.totalChapters}...`
                      : statusData.status || "Processing..."}
                  </span>
                </div>
              </div>
            )}

            {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

            <Button
              onClick={startGeneration}
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

        {isComplete && statusData?.finalMarkdown && statusData?.title && (
          <Card className="p-8">
            <h2 className="text-xl font-semibold mb-6">Your Ebook is Ready!</h2>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-48 shrink-0">
                <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center p-4 text-center">
                  <span className="text-white font-semibold">{statusData.title}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-bold">{statusData.title}</h3>
                <p className="text-muted-foreground">Topic: {topic}</p>
                <p className="text-muted-foreground">
                  Pages: \~{Math.ceil(statusData.finalMarkdown.split(/\s+/).length / 450)}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button onClick={generatePDF} className="flex-1 min-w-[150px]">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
