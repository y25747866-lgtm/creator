import { useState, forwardRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import {
  FileText, BookOpen, FileStack, Edit, RefreshCw,
  ArrowRight, Download, ArrowLeft, Sparkles, Loader2,
  Lock, CheckCircle2, Image as ImageIcon
} from "lucide-react";
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

/* ─── Constants ─── */
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
  { value: "short" as const, label: "Short", pages: "10-20 pages", icon: <FileText className="w-5 h-5" />, access: "free" as const },
  { value: "medium" as const, label: "Medium", pages: "20-40 pages", icon: <BookOpen className="w-5 h-5" />, access: "creator" as const },
  { value: "long" as const, label: "Long", pages: "40-60 pages", icon: <FileStack className="w-5 h-5" />, access: "creator" as const, isPro: true },
];

type GenerationStep = "idle" | "title" | "content" | "cover" | "complete";
type Screen = "form" | "generating" | "outline" | "download";

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: "",
  title: "Crafting your title...",
  content: "Writing your book... This may take a minute.",
  cover: "Designing your cover...",
  complete: "Your ebook is ready!",
};

const STEP_PROGRESS: Record<GenerationStep, number> = {
  idle: 0, title: 15, content: 60, cover: 85, complete: 100,
};

/* ─── Icon animation variants ─── */
const ICON_VARIANTS = {
  left: {
    initial: { scale: 0.8, opacity: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, rotate: -6, transition: { duration: 0.4, delay: 0.1 } },
    hover: { x: -22, y: -5, rotate: -15, scale: 1.1, transition: { duration: 0.2 } }
  },
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
    hover: { y: -10, scale: 1.15, transition: { duration: 0.2 } }
  },
  right: {
    initial: { scale: 0.8, opacity: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, rotate: 6, transition: { duration: 0.4, delay: 0.3 } },
    hover: { x: 22, y: -5, rotate: 15, scale: 1.1, transition: { duration: 0.2 } }
  }
};

const IconContainer = memo(({ children, variant }: { children: React.ReactNode; variant: 'left' | 'center' | 'right' }) => (
  <motion.div variants={ICON_VARIANTS[variant]} className="relative">
    <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground">
      {children}
    </div>
  </motion.div>
));
IconContainer.displayName = "IconContainer";

const EmptyStateIcons = memo(() => (
  <motion.div className="flex items-end justify-center gap-3 mb-6" initial="initial" animate="animate" whileHover="hover">
    <IconContainer variant="left"><FileText className="w-5 h-5" /></IconContainer>
    <IconContainer variant="center"><BookOpen className="w-5 h-5" /></IconContainer>
    <IconContainer variant="right"><FileStack className="w-5 h-5" /></IconContainer>
  </motion.div>
));
EmptyStateIcons.displayName = "EmptyStateIcons";

/* ─── Main Component ─── */
const EbookGenerator = () => {
  const [screen, setScreen] = useState<Screen>("form");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [ebookLength, setEbookLength] = useState<"short" | "medium" | "long">("short");
  const [step, setStep] = useState<GenerationStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ebookData, setEbookData] = useState<Ebook | null>(null);
  const [chapters, setChapters] = useState<{ id: number; title: string; description: string; phase: string; modules: string }[]>([]);

  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);
  const navigate = useNavigate();
  const { recordUsage } = useFeatureAccess();
  const { hasPaidSubscription, subscription, planType, loading: subLoading } = useSubscription();
  const { user } = useAuth();

  const isExpired = subscription?.status === "expired";
  const isCreatorOrAbove = (planType === "creator" || planType === "pro") && !isExpired;

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
    if (!canSelectLength("creator") && ebookLength !== "short") {
      toast({ title: "Upgrade Required", description: "Free plan only allows short ebooks.", variant: "destructive" });
      setEbookLength("short");
      return;
    }

    const allowed = await recordUsage("ebook_generator");
    if (!allowed) return;

    setScreen("generating");
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
        method: "POST", headers,
        body: JSON.stringify({ topic }),
      });
      if (!titleRes.ok) {
        const err = await titleRes.json().catch(() => ({ error: "Title generation failed" }));
        throw new Error(err.error || "Title generation failed");
      }
      const { title } = await titleRes.json();
      setStep("content");

      const contentRes = await fetch(`${baseUrl}/functions/v1/generate-ebook-content`, {
        method: "POST", headers,
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
          method: "POST", headers,
          body: JSON.stringify({ title, topic }),
        });
        if (coverRes.ok) {
          const coverData = await coverRes.json();
          coverImageUrl = coverData.imageUrl || null;
        }
      } catch { console.log("Cover generation skipped"); }

      const ebook: Ebook = {
        id: crypto.randomUUID(),
        title: contentData.title || title,
        topic, description,
        content: contentData.content,
        coverImageUrl,
        pages: contentData.pages,
        length: ebookLength,
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };

      // Extract chapter titles from content for outline view
      const chapterMatches = ebook.content.match(/^##\s+(.+)$/gm) || [];
      const extractedChapters = chapterMatches.map((ch, i) => ({
        id: i + 1,
        title: ch.replace(/^##\s+/, ''),
        description: `Chapter ${i + 1} of your ebook`,
        phase: `Phase ${Math.ceil((i + 1) / 3)}`,
        modules: `${Math.floor(Math.random() * 4) + 2} Sections`,
      }));
      setChapters(extractedChapters.length > 0 ? extractedChapters : [
        { id: 1, title: "Introduction", description: "Opening chapter", phase: "Phase 1", modules: "3 Sections" },
      ]);

      addEbook(ebook);
      setEbookData(ebook);
      setStep("complete");
      setScreen("outline");

      try {
        const { product } = await createTrackedProduct({
          title: ebook.title, topic: ebook.topic,
          description: ebook.description || "", length: ebook.length || "medium",
          content: ebook.content, coverImageUrl: ebook.coverImageUrl, pages: ebook.pages,
        });
        ebook.dbProductId = product?.id;
        if (product?.id) {
          try { await recordMetric(product.id, "view"); } catch {}
        }
      } catch (trackErr) { console.warn("Product tracking save failed:", trackErr); }

      toast({ title: "Success!", description: `"${ebook.title}" is ready.` });
    } catch (err: any) {
      console.error("Generation error:", err);
      setErrorMsg(err.message);
      setStep("idle");
      setScreen("form");
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!isCreatorOrAbove) {
      toast({ title: "Upgrade Required", description: "Downloads require Creator or Pro plan.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      generatePDF(ebookData);
      if (ebookData.dbProductId) { try { await recordMetric(ebookData.dbProductId, "download"); } catch {} }
    }
  };

  const handleDownloadCover = async () => {
    if (!isCreatorOrAbove) {
      toast({ title: "Upgrade Required", description: "Downloads require Creator or Pro plan.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      downloadCoverImage(ebookData);
      if (ebookData.dbProductId) { try { await recordMetric(ebookData.dbProductId, "cover_download"); } catch {} }
    }
  };

  const resetForm = () => {
    setScreen("form");
    setStep("idle");
    setEbookData(null);
    setChapters([]);
    setTopic(""); setDescription(""); setCategory("");
    setTargetAudience(""); setTone("professional");
    setEbookLength("short"); setErrorMsg(null);
  };

  /* ─── Render: Outline Screen ─── */
  const renderOutline = () => (
    <motion.div key="outline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground border border-border bg-muted/50 rounded mb-4">
          EBOOK OUTLINE
        </span>
        <h2 className="text-2xl font-bold mb-1">Your Ebook Structure</h2>
        <p className="text-sm text-muted-foreground">Review your chapters before downloading</p>
      </div>

      <div className="space-y-3 mb-8">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">{chapter.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{chapter.description}</p>
            <div className="flex gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{chapter.phase}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{chapter.modules}</span>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => setScreen("download")} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );

  /* ─── Render: Download Screen ─── */
  const renderDownload = () => (
    <motion.div key="download" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md mx-auto text-center"
    >
      {/* Book cover preview */}
      <div className="mb-8">
        <div className="w-48 h-64 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 border border-border rounded-xl flex flex-col items-center justify-center p-6 shadow-xl">
          <h3 className="font-bold text-sm text-center mb-2 leading-tight">{ebookData?.title}</h3>
          <p className="text-[10px] text-muted-foreground">A Complete Guide</p>
          <p className="text-[10px] text-muted-foreground/50 mt-auto">NexoraOS</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Your Ebook is Ready</h2>
        </div>
        <p className="font-semibold text-sm">{ebookData?.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {ebookData?.pages} pages · PDF format
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={handleDownloadPDF} size="lg" className="w-full gap-2" disabled={!isCreatorOrAbove}>
          <Download className="w-4 h-4" />
          {isCreatorOrAbove ? "Download PDF" : "Upgrade to Download"}
        </Button>

        {ebookData?.coverImageUrl && (
          <Button onClick={handleDownloadCover} variant="outline" size="lg" className="w-full gap-2" disabled={!isCreatorOrAbove}>
            <ImageIcon className="w-4 h-4" />
            Download Cover
          </Button>
        )}

        {!isCreatorOrAbove && (
          <p className="text-xs text-muted-foreground">Upgrade to Creator or Pro to download.</p>
        )}

        <Button variant="ghost" onClick={resetForm} className="w-full gap-2">
          <RefreshCw className="w-4 h-4" />
          Generate Another
        </Button>
      </div>
    </motion.div>
  );

  /* ─── Render: Generating Screen ─── */
  const renderGenerating = () => (
    <motion.div key="generating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto text-center py-16"
    >
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 relative">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-pulse">
          <Sparkles className="w-3 h-3 text-primary-foreground" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2">{STEP_LABELS[step]}</h2>
      <p className="text-muted-foreground mb-8">This typically takes 30-60 seconds.</p>
      <div className="max-w-sm mx-auto">
        <Progress value={STEP_PROGRESS[step]} className="h-2 mb-2" />
        <p className="text-xs text-muted-foreground text-right font-medium">{STEP_PROGRESS[step]}% Complete</p>
      </div>
    </motion.div>
  );

  /* ─── Render: Form Screen ─── */
  const renderForm = () => (
    <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      {/* Empty state header */}
      <div className="text-center mb-10">
        <EmptyStateIcons />
        <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground border border-border bg-muted/50 rounded mb-4">
          AI PRODUCT GENERATOR
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Create Professional Ebooks</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Enter your topic and let AI write a complete ebook ready to download as PDF in minutes.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">

        {/* Topic */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Ebook Topic</label>
          <input
            type="text"
            placeholder="e.g. Passive income strategies for 2025"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full h-12 rounded-xl border border-border bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        {/* Category + Tone grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Category</label>
            <select
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Target Audience</label>
          <input
            type="text"
            placeholder="e.g. Beginners, Freelancers, Small business owners"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        {/* Length Selector */}
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
                      toast({ title: "Upgrade Required", description: `${opt.label} ebooks require Creator or Pro.`, variant: "destructive" });
                      return;
                    }
                    setEbookLength(opt.value);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all relative group",
                    ebookLength === opt.value && !locked
                      ? "border-primary bg-primary/5"
                      : locked
                        ? "border-border/50 opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="mb-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    {opt.icon}
                  </div>
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.pages}</span>
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

        {/* Additional Context */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Additional Context <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <textarea
            placeholder="Add specific points you want the AI to cover..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[100px] rounded-xl border border-border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={startGeneration}
          size="lg"
          className="w-full h-14 text-base font-bold gap-2 rounded-xl"
        >
          Generate Ebook
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="relative">
        {isExpired && !subLoading && (
          <UpgradeOverlay message="Your subscription has expired. Please renew to continue using the AI Product Generator." />
        )}
        <LazyMotion features={domAnimation}>
          <div className={cn("px-4 py-10 sm:py-14", isExpired && "opacity-50 pointer-events-none")}>
            <AnimatePresence mode="wait">
              {screen === "form" && renderForm()}
              {screen === "generating" && renderGenerating()}
              {screen === "outline" && renderOutline()}
              {screen === "download" && renderDownload()}
            </AnimatePresence>
          </div>
        </LazyMotion>
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
