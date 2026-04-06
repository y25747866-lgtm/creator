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
      className="max-w-[580px]"
    >
      <div className="mb-8">
        <span style={{ display: 'inline-block', background: '#111111', border: '1px solid #1A1A1A', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: '12px' }}>
          EBOOK OUTLINE
        </span>
        <h2 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, color: '#FFFFFF', textAlign: 'left', marginBottom: '8px' }}>Your Ebook Structure</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: '#666666', textAlign: 'left', marginBottom: '32px' }}>Review your chapters before downloading</p>
      </div>

      <div className="space-y-3 mb-8">
        {chapters.map((chapter) => (
          <div key={chapter.id} style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', transition: 'all 0.3s ease' }}>
            <div className="flex items-start justify-between mb-2">
              <h3 style={{ fontFamily: 'Syne', fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{chapter.title}</h3>
            </div>
            <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: '#666666', marginBottom: '12px' }}>{chapter.description}</p>
            <div className="flex gap-2">
              <span style={{ background: '#161616', border: '1px solid #1A1A1A', color: '#555555', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>{chapter.phase}</span>
              <span style={{ background: '#161616', border: '1px solid #1A1A1A', color: '#555555', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>{chapter.modules}</span>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => setScreen("download")} style={{ background: '#FFFFFF', color: '#0A0A0A', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', borderRadius: '6px', height: '48px', width: '100%' }}>
        Continue <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );

  /* ─── Render: Download Screen ─── */
  const renderDownload = () => (
    <motion.div key="download" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-[580px] text-left"
    >
      {/* Book cover preview */}
      <div className="mb-8">
        <div style={{ width: '192px', height: '256px', background: '#111111', border: '1px solid #2A2A2A', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '14px', color: '#FFFFFF', textAlign: 'center', marginBottom: '8px', lineHeight: '1.2' }}>{ebookData?.title}</h3>
          <p style={{ fontFamily: 'DM Sans', fontSize: '10px', color: '#666666' }}>A Complete Guide</p>
          <p style={{ fontFamily: 'DM Sans', fontSize: '10px', color: '#333333', marginTop: 'auto' }}>NexoraOS</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <h2 style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>Your Ebook is Ready</h2>
        </div>
        <p style={{ fontFamily: 'DM Sans', fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>{ebookData?.title}</p>
        <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#666666', marginTop: '4px' }}>
          {ebookData?.pages} pages · PDF format
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={handleDownloadPDF} style={{ background: '#FFFFFF', color: '#0A0A0A', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', borderRadius: '6px', height: '48px', width: '100%' }} disabled={!isCreatorOrAbove}>
          <Download className="w-4 h-4 mr-2" />
          {isCreatorOrAbove ? "Download PDF" : "Upgrade to Download"}
        </Button>

        {ebookData?.coverImageUrl && (
          <Button onClick={handleDownloadCover} variant="outline" style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', borderRadius: '6px', height: '48px', width: '100%' }} disabled={!isCreatorOrAbove}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Download Cover
          </Button>
        )}

        {!isCreatorOrAbove && (
          <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: '#666666', textAlign: 'center' }}>Upgrade to Creator or Pro to download.</p>
        )}

        <Button variant="ghost" onClick={resetForm} style={{ color: '#666666', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Another
        </Button>
      </div>
    </motion.div>
  );

  /* ─── Render: Generating Screen ─── */
  const renderGenerating = () => (
    <motion.div key="generating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-[580px] text-left py-16"
    >
      <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: '#111111', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', position: 'relative' }}>
        <Loader2 className="w-10 h-10 text-white animate-spin mx-auto" />
      </div>
      <h2 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>{STEP_LABELS[step]}</h2>
      <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: '#666666', marginBottom: '32px' }}>This typically takes 30-60 seconds.</p>
      <div className="max-w-sm">
        <Progress value={STEP_PROGRESS[step]} className="h-1 bg-[#1A1A1A]" style={{ borderRadius: '2px' }} />
        <p style={{ fontFamily: 'DM Sans', fontSize: '11px', color: '#555555', textAlign: 'right', marginTop: '8px', fontWeight: 600 }}>{STEP_PROGRESS[step]}% COMPLETE</p>
      </div>
    </motion.div>
  );

  /* ─── Render: Form Screen ─── */
  const renderForm = () => (
    <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-[580px]"
    >
      {/* Header */}
      <div className="mb-10">
        <span style={{ display: 'inline-block', background: '#111111', border: '1px solid #1A1A1A', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: '12px' }}>
          AI PRODUCT GENERATOR
        </span>
        <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, color: '#FFFFFF', textAlign: 'left', marginBottom: '8px' }}>Create Professional Ebooks</h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: '#666666', textAlign: 'left', marginBottom: '32px' }}>
          Enter your topic and let AI write a complete ebook ready to download as PDF in minutes.
        </p>
      </div>

      {/* Form card */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '32px', marginBottom: '16px' }}>
        <div className="space-y-6">
          {/* Topic */}
          <div className="space-y-2">
            <label style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Ebook Topic</label>
            <input
              type="text"
              placeholder="e.g. Passive income strategies for 2025"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans', fontSize: '14px', padding: '12px 14px', width: '100%', outline: 'none' }}
              className="placeholder:text-[#333333] focus:border-white/25 transition-colors"
            />
          </div>

          {/* Category + Tone grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Category</label>
              <select
                style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans', fontSize: '14px', padding: '12px 14px', width: '100%', outline: 'none', appearance: 'none' }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="focus:border-white/25 transition-colors"
              >
                <option value="" style={{ background: '#161616' }}>Select Category</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} style={{ background: '#161616' }}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Tone</label>
              <select
                style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans', fontSize: '14px', padding: '12px 14px', width: '100%', outline: 'none', appearance: 'none' }}
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="focus:border-white/25 transition-colors"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#161616' }}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Target Audience</label>
            <input
              type="text"
              placeholder="e.g. Beginners, Freelancers, Small business owners"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans', fontSize: '14px', padding: '12px 14px', width: '100%', outline: 'none' }}
              className="placeholder:text-[#333333] focus:border-white/25 transition-colors"
            />
          </div>

          {/* Length Selector */}
          <div className="space-y-2">
            <label style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Ebook Length</label>
            <div className="grid grid-cols-3 gap-3">
              {LENGTH_OPTIONS.map((opt) => {
                const locked = !canSelectLength(opt.access);
                const isSelected = ebookLength === opt.value && !locked;
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
                    style={{
                      background: isSelected ? '#1C1C1C' : '#161616',
                      border: isSelected ? '2px solid rgba(255,255,255,0.3)' : '1px solid #1A1A1A',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                      {opt.icon}
                    </div>
                    <span style={{ fontFamily: 'Syne', fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{opt.label}</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: '11px', color: '#555555', marginTop: '2px' }}>{opt.pages}</span>
                    {locked && (
                      <div className="absolute -top-2 -right-2">
                        <Lock className="w-3 h-3 text-white/30" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <label style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Additional Context <span style={{ color: '#333333', fontWeight: 400, textTransform: 'none' }}>(Optional)</span></label>
            <textarea
              placeholder="Add specific points you want the AI to cover..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans', fontSize: '14px', padding: '12px 14px', width: '100%', minHeight: '100px', outline: 'none', resize: 'none' }}
              className="placeholder:text-[#333333] focus:border-white/25 transition-colors"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={startGeneration}
            style={{ background: '#FFFFFF', color: '#0A0A0A', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', border: 'none', borderRadius: '6px', height: '48px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
          >
            Generate Ebook
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Placeholder card */}
      <div style={{ background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '10px', padding: '48px 32px', textAlign: 'center', color: '#2A2A2A', fontSize: '13px', fontFamily: 'DM Sans' }}>
        Your generated ebook will appear here
      </div>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div style={{ background: '#0A0A0A', minHeight: '100vh', padding: '40px' }}>
        <div className="relative">
          {isExpired && !subLoading && (
            <UpgradeOverlay message="Your subscription has expired. Please renew to continue using the AI Product Generator." />
          )}
          <LazyMotion features={domAnimation}>
            <div className={cn(isExpired && "opacity-50 pointer-events-none")}>
              <AnimatePresence mode="wait">
                {screen === "form" && renderForm()}
                {screen === "generating" && renderGenerating()}
                {screen === "outline" && renderOutline()}
                {screen === "download" && renderDownload()}
              </AnimatePresence>
            </div>
          </LazyMotion>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
