import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, Download } from "lucide-react";
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
  const [tone, setTone] = useState("clear, authoritative, practical");
  const [ebookLength, setEbookLength] = useState<"short" | "medium" | "long">("medium");
  const [jobId, setJobId] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);

  // Auto-generate title preview as user types
  const [generatedTitlePreview, setGeneratedTitlePreview] = useState("");
  useEffect(() => {
    if (topic.length > 3) {
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch("/api/generate-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic }),
          });
          if (res.ok) {
            const data = await res.json();
            setGeneratedTitlePreview(data.title || "");
          }
        } catch {}
      }, 800);
      return () => clearTimeout(timeout);
    } else {
      setGeneratedTitlePreview("");
    }
  }, [topic]);

  // Start generation → create job
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
        const err = await res.text();
        throw new Error(err || "Failed to start generation");
      }

      const data = await res.json();
      setJobId(data.jobId);
      toast({ title: "Started", description: "Ebook generation in progress..." });
    } catch (err: any) {
      setErrorMsg(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsGenerating(false);
    }
  };

  // Poll status + auto-trigger next chapter
  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ebook-status?jobId=${jobId}`);
        if (!res.ok) throw new Error("Status fetch failed");

        const data = await res.json();
        setStatusData(data);

        // Auto-trigger next chapter if ready
        if (
          data.status === "outline_done" &&
          data.progress < data.totalChapters
        ) {
          await fetch("/api/generate-chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, chapterIndex: data.progress }),
          });
        }

        // When complete → save to store & show success
        if (data.status === "complete" && data.finalMarkdown) {
          const ebook: Ebook = {
            id: jobId!,
            title: data.title,
            topic,
            content: data.finalMarkdown,
            coverImageUrl: null, // update later if you add cover
            pages: Math.ceil(data.finalMarkdown.split(/\s+/).length / 450),
            createdAt: new Date().toISOString(),
          };
          addEbook(ebook);
          toast({
            title: "Success!",
            description: `Your \~${ebook.pages}-page ebook is ready!`,
          });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // every 5 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, topic, addEbook]);

  const isComplete = statusData?.status === "complete";
  const currentProgress = statusData?.progress || 0;
  const total = statusData?.totalChapters || 0;

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

            {generatedTitlePreview && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-primary mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Suggested Title</span>
                </div>
                <p className="font-semibold text-lg">{generatedTitlePreview}</p>
              </div>
            )}

            {isGenerating && statusData && (
              <div className="space-y-3">
                <Progress value={(currentProgress / total) * 100 || 0} className="h-2" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {isComplete
                      ? "Done!"
                      : statusData.status?.includes("writing")
                      ? `Writing chapter ${currentProgress + 1} of ${total}...`
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

        {isComplete && statusData?.finalMarkdown && (
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
                  <Button
                    onClick={() =>
                      generatePDF({
                        id: jobId!,
                        title: statusData.title,
                        topic,
                        content: statusData.finalMarkdown,
                        coverImageUrl: null,
                        pages: Math.ceil(statusData.finalMarkdown.split(/\s+/).length / 450),
                        createdAt: new Date().toISOString(),
                      })
                    }
                    className="flex-1 min-w-[150px]"
                  >
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
