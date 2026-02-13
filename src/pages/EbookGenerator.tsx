import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, Download, Sparkles, FileText, Image as ImageIcon, CheckCircle2, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { generatePDF, downloadCoverImage } from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { createTrackedProduct, recordMetric } from "@/lib/productTracking";
import { useFreeTrial } from "@/hooks/useFreeTrial";
import TrialExpiredModal from "@/components/TrialExpiredModal";

const CATEGORY_OPTIONS = [
  "Business & Entrepreneurship",
  "Self-Help & Personal Development",
  "Finance & Investing",
  "Marketing & Sales",
  "Technology & AI",
  "Health & Wellness",
  "Education & Learning",
  "Creativity & Design",
  "Relationships & Communication",
  "Productivity & Habits",
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "motivational", label: "Motivational" },
  { value: "educational", label: "Educational" },
  { value: "business", label: "Business" },
  { value: "conversational", label: "Conversational" },
  { value: "inspirational", label: "Inspirational" },
];

const LENGTH_OPTIONS = [
  { value: "short" as const, label: "Short", pages: "10–15 pages", icon: "📄" },
  { value: "medium" as const, label: "Medium", pages: "20–30 pages", icon: "📕" },
  { value: "long" as const, label: "Long", pages: "40–50 pages", icon: "📚" },
];

type GenerationStep = "idle" | "title" | "content" | "cover" | "complete";

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: "",
  title: "Crafting your title...",
  content: "Writing your book... This may take a minute.",
  cover: "Designing your cover...",
  complete: "Your ebook is ready!",
};

const STEP_PROGRESS: Record<GenerationStep, number> = {
  idle: 0,
  title: 15,
  content: 60,
  cover: 85,
  complete: 100,
};

const EbookGenerator = () => {
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [ebookLength, setEbookLength] = useState<"short" | "medium" | "long">("medium");
  const [step, setStep] = useState<GenerationStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ebookData, setEbookData] = useState<Ebook | null>(null);
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);
  const navigate = useNavigate();
  const { isFreeUser, expired } = useFreeTrial();

  const isGenerating = step !== "idle" && step !== "complete";

  const startGeneration = async () => {
    if (!topic.trim() || !category) {
      toast({ title: "Required Fields", description: "Please enter a topic and select a category.", variant: "destructive" });
      return;
    }

    setStep("title");
    setErrorMsg(null);
    setEbookData(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please log in to generate ebooks.");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Step 1: Generate title
      const titleRes = await fetch(`${baseUrl}/functions/v1/generate-ebook-title`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic }),
      });

      if (!titleRes.ok) {
        const err = await titleRes.json().catch(() => ({ error: "Title generation failed" }));
        throw new Error(err.error || "Title generation failed");
      }

      const { title } = await titleRes.json();
      setStep("content");

      // Step 2: Generate content
      const contentRes = await fetch(`${baseUrl}/functions/v1/generate-ebook-content`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, title, description, length: ebookLength, category, targetAudience, tone }),
      });

      if (!contentRes.ok) {
        const err = await contentRes.json().catch(() => ({ error: "Content generation failed" }));
        throw new Error(err.error || "Content generation failed");
      }

      const contentData = await contentRes.json();
      setStep("cover");

      // Step 3: Generate cover
      let coverImageUrl: string | null = null;
      try {
        const coverRes = await fetch(`${baseUrl}/functions/v1/generate-ebook-cover`, {
          method: "POST",
          headers,
          body: JSON.stringify({ title, topic }),
        });

        if (coverRes.ok) {
          const coverData = await coverRes.json();
          coverImageUrl = coverData.imageUrl || null;
        }
      } catch {
        console.log("Cover generation skipped");
      }

      // Build ebook object
      const ebook: Ebook = {
        id: crypto.randomUUID(),
        title: contentData.title || title,
        topic,
        description,
        content: contentData.content,
        coverImageUrl,
        pages: contentData.pages,
        length: ebookLength,
        createdAt: new Date().toISOString(),
      };

      addEbook(ebook);
      setEbookData(ebook);
      setStep("complete");

      // Save to DB for tracking
      try {
        const { product } = await createTrackedProduct({
          title: ebook.title,
          topic: ebook.topic,
          description: ebook.description || "",
          length: ebook.length || "medium",
          content: ebook.content,
          coverImageUrl: ebook.coverImageUrl,
          pages: ebook.pages,
        });
        // Store the DB product ID on the ebook for metric tracking
        ebook.dbProductId = product?.id;
      } catch (trackErr) {
        console.warn("Product tracking save failed:", trackErr);
      }

      toast({ title: "Success!", description: `"${ebook.title}" is ready to download.` });
    } catch (err: any) {
      console.error("Generation error:", err);
      setErrorMsg(err.message);
      setStep("idle");
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadPDF = () => {
    if (isFreeUser) {
      toast({ title: "Upgrade Required", description: "Downloads are available on paid plans.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      generatePDF(ebookData);
      if (ebookData.dbProductId) {
        recordMetric(ebookData.dbProductId, "download").catch(() => {});
      }
    }
  };

  const handleDownloadCover = () => {
    if (isFreeUser) {
      toast({ title: "Upgrade Required", description: "Downloads are available on paid plans.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      downloadCoverImage(ebookData);
      if (ebookData.dbProductId) {
        recordMetric(ebookData.dbProductId, "cover_download").catch(() => {});
      }
    }
  };

  const resetForm = () => {
    setStep("idle");
    setEbookData(null);
    setTopic("");
    setDescription("");
    setCategory("");
    setTargetAudience("");
    setTone("professional");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Book Generator
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Create Professional Ebooks
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Enter your topic and let AI write a complete, human-quality ebook — ready to download as PDF in minutes.
          </p>
        </motion.div>

        {/* Main Form / Result */}
        <AnimatePresence mode="wait">
          {step === "complete" && ebookData ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="p-8 sm:p-10 border-primary/20">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{ebookData.title}</h2>
                  <p className="text-muted-foreground">
                    {ebookData.pages} pages • {ebookData.length === "short" ? "Short" : ebookData.length === "long" ? "Long" : "Medium"} format
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleDownloadPDF} size="lg" className="gap-2">
                    <Download className="w-5 h-5" />
                    Download PDF
                  </Button>
                  {ebookData.coverImageUrl && (
                    <Button onClick={handleDownloadCover} variant="outline" size="lg" className="gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Download Cover
                    </Button>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t flex flex-col gap-3">
                  <Button
                    onClick={() => navigate("/dashboard/monetization")}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Package className="w-5 h-5" />
                    Monetize This Ebook
                  </Button>
                  <Button onClick={resetForm} variant="ghost" className="w-full">
                    Generate Another Ebook
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-8 sm:p-10">
                <div className="space-y-8">
                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Topic *</label>
                    <Input
                      placeholder="e.g., How to build passive income with digital products"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isGenerating}
                      className="h-12 text-base"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={isGenerating}
                      className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base"
                    >
                      <option value="">Select a category</option>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Target Audience <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      placeholder="e.g., Beginners who want to start an online business"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      disabled={isGenerating}
                      className="h-12 text-base"
                    />
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-sm font-semibold mb-3">Tone</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {TONE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          disabled={isGenerating}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            tone === t.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 text-muted-foreground"
                          } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Description <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Textarea
                      placeholder="Describe what you want the book to cover, specific chapters, or any special requirements..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isGenerating}
                      rows={3}
                      className="text-base resize-none"
                    />
                  </div>

                  {/* Length Selector */}
                  <div>
                    <label className="block text-sm font-semibold mb-3">Book Length</label>
                    <div className="grid grid-cols-3 gap-3">
                      {LENGTH_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setEbookLength(opt.value)}
                          disabled={isGenerating}
                          className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                            ebookLength === opt.value
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40"
                          } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="text-2xl mb-1">{opt.icon}</div>
                          <div className="font-semibold text-sm">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.pages}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress */}
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3"
                    >
                      <Progress value={STEP_PROGRESS[step]} className="h-2" />
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {STEP_LABELS[step]}
                      </div>
                    </motion.div>
                  )}

                  {/* Error */}
                  {errorMsg && (
                    <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {errorMsg}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    onClick={startGeneration}
                    disabled={isGenerating || !topic.trim() || !category}
                    size="lg"
                    className="w-full h-14 text-base font-semibold gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-5 h-5" />
                        Generate Ebook
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {isFreeUser && <TrialExpiredModal open={expired} />}
    </div>
  );
};

export default EbookGenerator;
