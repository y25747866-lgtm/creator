import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, Download, Sparkles, FileText, Image as ImageIcon, CheckCircle2, Package, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { generatePDF, downloadCoverImage } from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { createTrackedProduct, recordMetric } from "@/lib/productTracking";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { cn } from "@/lib/utils";

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
  { value: "short" as const, label: "Short", pages: "10–15 pages", icon: "📄", access: "free" as const },
  { value: "medium" as const, label: "Medium", pages: "20–30 pages", icon: "📕", access: "creator" as const },
  { value: "long" as const, label: "Long", pages: "40–50 pages", icon: "📚", access: "creator" as const },
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
  const [ebookLength, setEbookLength] = useState<"short" | "medium" | "long">("short");
  const [step, setStep] = useState<GenerationStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ebookData, setEbookData] = useState<Ebook | null>(null);
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);
  const navigate = useNavigate();
  const { recordUsage } = useFeatureAccess();
  const { hasPaidSubscription, subscription, planType, loading: subLoading } = useSubscription();
  const { user } = useAuth();

  const isExpired = subscription?.status === "expired";
  const hasAccess = !isExpired || hasPaidSubscription;
  const isCreatorOrAbove = (planType === "creator" || planType === "pro") && !isExpired;
  const isGenerating = step !== "idle" && step !== "complete";

  const canSelectLength = (access: "free" | "creator" | "pro") => {
    if (access === "free") return true;
    if (access === "creator") return isCreatorOrAbove;
    return planType === "pro" && !isExpired;
  };

  const startGeneration = async () => {
    if (!topic.trim() || !category) {
      toast({ title: "Required Fields", description: "Please enter a topic and select a category.", variant: "destructive" });
      return;
    }

    // Enforce length restriction for free users
    if (!canSelectLength("creator") && ebookLength !== "short") {
      toast({ title: "Upgrade Required", description: "Free plan only allows short ebooks. Upgrade to Creator or Pro for medium and long.", variant: "destructive" });
      setEbookLength("short");
      return;
    }

    const allowed = await recordUsage("ebook_generator");
    if (!allowed) return;

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
        userId: user?.id,
      };

      addEbook(ebook);
      setEbookData(ebook);
      setStep("complete");

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

  const handleDownloadPDF = async () => {
    if (!isCreatorOrAbove) {
      toast({ title: "Upgrade Required", description: "Downloads are available on Creator and Pro plans.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      generatePDF(ebookData);
      if (ebookData.dbProductId) {
        try { await recordMetric(ebookData.dbProductId, "download"); } catch {}
      }
    }
  };

  const handleDownloadCover = async () => {
    if (!isCreatorOrAbove) {
      toast({ title: "Upgrade Required", description: "Downloads are available on Creator and Pro plans.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      downloadCoverImage(ebookData);
      if (ebookData.dbProductId) {
        try { await recordMetric(ebookData.dbProductId, "cover_download"); } catch {}
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
    setEbookLength("short");
    setErrorMsg(null);
  };

  return (
    <DashboardLayout>
    <div className="relative">
      {isExpired && !subLoading && (
        <UpgradeOverlay message="Your subscription has expired. Please renew to continue using the AI Product Generator." />
      )}

      <div className={cn("max-w-3xl mx-auto px-4 py-12 sm:py-16", isExpired && "opacity-50 pointer-events-none")}>
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

        <AnimatePresence mode="wait">
          {step === "complete" && ebookData ? (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
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
                  <Button onClick={handleDownloadPDF} size="lg" className="gap-2" disabled={!isCreatorOrAbove}>
                    <Download className="w-5 h-5" />
                    {isCreatorOrAbove ? "Download PDF" : "Upgrade to Download"}
                  </Button>
                  {ebookData.coverImageUrl && (
                    <Button onClick={handleDownloadCover} variant="outline" size="lg" className="gap-2" disabled={!isCreatorOrAbove}>
                      <ImageIcon className="w-5 h-5" />
                      Download Cover
                    </Button>
                  )}
                </div>

                {!isCreatorOrAbove && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Upgrade to Creator or Pro plan to download your ebooks.
                  </p>
                )}

                <div className="mt-8 pt-8 border-t border-border/50 text-center">
                  <Button variant="ghost" onClick={resetForm}>
                    Create Another Ebook
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : isGenerating ? (
            <motion.div key="generating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-12">
              <div className="mb-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 relative">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">{STEP_LABELS[step]}</h2>
                <p className="text-muted-foreground">This typically takes 30-60 seconds.</p>
              </div>
              <div className="max-w-md mx-auto">
                <Progress value={STEP_PROGRESS[step]} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground text-right font-medium">{STEP_PROGRESS[step]}% Complete</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <Card className="p-6 sm:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      What is your ebook about?
                    </label>
                    <Input
                      placeholder="e.g. Passive income strategies for 2024"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Category</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">Select Category</option>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Tone</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                      >
                        {TONE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Ebook Length</label>
                    <div className="grid grid-cols-3 gap-3">
                      {LENGTH_OPTIONS.map((opt) => {
                        const locked = !canSelectLength(opt.access);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (locked) {
                                toast({ title: "Upgrade Required", description: `${opt.label} ebooks require a Creator or Pro plan.`, variant: "destructive" });
                                return;
                              }
                              setEbookLength(opt.value);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all relative",
                              ebookLength === opt.value && !locked
                                ? "border-primary bg-primary/5 text-primary"
                                : locked
                                  ? "border-border/50 opacity-50 cursor-not-allowed"
                                  : "border-border hover:border-primary/30"
                            )}
                          >
                            <span className="text-xl mb-1">{opt.icon}</span>
                            <span className="text-xs font-bold">{opt.label}</span>
                            <span className="text-[10px] opacity-70">{opt.pages}</span>
                            {locked && (
                              <Badge variant="outline" className="absolute -top-2 -right-2 text-[8px] px-1 py-0 h-3.5 font-bold border-primary/30 text-primary bg-background">
                                <Lock className="w-2 h-2 mr-0.5" />
                                PRO
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Additional Context (Optional)</label>
                    <Textarea
                      placeholder="Add specific points you want the AI to cover..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                  </div>

                  <Button
                    onClick={startGeneration}
                    size="lg"
                    className="w-full h-14 text-lg font-bold gap-2 shadow-lg shadow-primary/20"
                    disabled={isGenerating}
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate My Ebook
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
