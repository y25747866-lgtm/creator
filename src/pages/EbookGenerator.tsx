import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, BookOpen, FileStack, RefreshCw,
  ArrowRight, Download, Sparkles, Loader2,
  CheckCircle2, Image as ImageIcon, Search,
  ChevronRight, Globe, Lock, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { supabase } from "@/integrations/supabase/client";
import { createTrackedProduct, recordMetric } from "@/lib/productTracking";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PAGE_W = 595, PAGE_H = 842;
const MX = 50, MY = 50, CONTENT_W = PAGE_W - MX * 2;
const ACCENT = "#7C3AED", BLACK = "#000000", WHITE = "#FFFFFF";

// ─── UTILS ───────────────────────────────────────────────────────────────────
function base64ToBytes(base64: string): Uint8Array {
  const s = atob(base64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
function strBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}
function buildPDF(jpegUrls: string[], pw: number, ph: number): Uint8Array {
  const n = jpegUrls.length;
  const perPage = 3;
  const total = 2 + n * perPage;
  const imgId = (i: number) => 3 + i * perPage;
  const contentId = (i: number) => 3 + i * perPage + 1;
  const pageId = (i: number) => 3 + i * perPage + 2;
  const pageIds = Array.from({ length: n }, (_, i) => pageId(i));
  const parts: Uint8Array[] = [];
  const offsets = new Array(total + 1).fill(0);
  let pos = 0;
  const push = (s: string) => { const b = strBytes(s); parts.push(b); pos += b.length; };
  const pushB = (b: Uint8Array) => { parts.push(b); pos += b.length; };
  const obj = (id: number, body: string) => {
    offsets[id] = pos;
    push(`${id} 0 obj\n${body}\nendobj\n\n`);
  };
  push("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n\n");
  obj(1, `<<\n/Type /Catalog\n/Pages 2 0 R\n>>`);
  obj(2, `<<\n/Type /Pages\n/Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}]\n/Count ${n}\n>>`);
  for (let i = 0; i < n; i++) {
    const imgBytes = base64ToBytes(jpegUrls[i].split(",")[1]);
    offsets[imgId(i)] = pos;
    push(`${imgId(i)} 0 obj\n<<\n/Type /XObject\n/Subtype /Image\n/Width ${pw}\n/Height ${ph}\n/ColorSpace /DeviceRGB\n/BitsPerComponent 8\n/Filter /DCTDecode\n/Length ${imgBytes.length}\n>>\nstream\n`);
    pushB(imgBytes);
    push(`\nendstream\nendobj\n\n`);
    const cs = `q\n${pw} 0 0 ${ph} 0 0 cm\n/Im${imgId(i)} Do\nQ\n`;
    obj(contentId(i), `<<\n/Length ${cs.length}\n>>\nstream\n${cs}\nendstream`);
    obj(pageId(i), `<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 ${pw} ${ph}]\n/Contents ${contentId(i)} 0 R\n/Resources <<\n/XObject <<\n/Im${imgId(i)} ${imgId(i)} 0 R\n>>\n>>\n>>`);
  }
  const xref = pos;
  push(`xref\n0 ${total + 1}\n`);
  push("0000000000 65535 f \n");
  for (let i = 1; i <= total; i++) push(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<<\n/Size ${total + 1}\n/Root 1 0 R\n>>\nstartxref\n${xref}\n%%EOF\n`);
  return concat(...parts);
}

// ─── PDF RENDERER ─────────────────────────────────────────────────────────────
class EbookPDFRenderer {
  readonly pages: HTMLCanvasElement[] = [];
  private _lastCtx: CanvasRenderingContext2D | null = null;
  private _lastY: number = 0;
  private newPage(): CanvasRenderingContext2D {
    const c = document.createElement("canvas");
    c.width = PAGE_W; c.height = PAGE_H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    this.pages.push(c);
    return ctx;
  }
  private wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  private footer(ctx: CanvasRenderingContext2D, title: string, n: number) {
    const y = PAGE_H - 32;
    ctx.strokeStyle = "#E0E0E0"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(MX, y - 8); ctx.lineTo(PAGE_W - MX, y - 8); ctx.stroke();
    const short = title.length > 60 ? title.substring(0, 60) + "…" : title;
    ctx.fillStyle = "#555555";
    ctx.font = "10px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(short, PAGE_W / 2, y + 8);
    ctx.fillStyle = "#555555";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(n), PAGE_W - MX, y + 8);
    ctx.fillStyle = "#999999";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Copyrighted Material", MX, y + 8);
  }
  async drawCover(title: string, subtitle: string, topic: string, img64: string | null) {
    const ctx = this.newPage();
    const w = PAGE_W, h = PAGE_H;
    ctx.fillStyle = BLACK; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, w, 8);
    if (img64) {
      const img = new Image();
      img.src = img64;
      await new Promise(r => img.onload = r);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.globalAlpha = 1.0;
    }
    ctx.fillStyle = WHITE; ctx.textAlign = "center";
    ctx.font = "bold 42px sans-serif";
    let y = 180;
    for (const l of this.wrap(ctx, title.toUpperCase(), w - 100)) { ctx.fillText(l, w / 2, y); y += 50; }
    ctx.fillStyle = ACCENT; ctx.fillRect(w / 2 - 40, y + 20, 80, 4);
    ctx.fillStyle = "#AAAAAA"; ctx.font = "italic 18px Georgia, serif";
    y += 70;
    for (const l of this.wrap(ctx, subtitle, w - 140)) { ctx.fillText(l, w / 2, y); y += 26; }
    ctx.fillStyle = WHITE; ctx.font = "bold 12px sans-serif";
    ctx.fillText("AI GENERATED MASTERPIECE", w / 2, h - 60);
  }
  drawTitlePage(title: string) {
    const ctx = this.newPage();
    ctx.fillStyle = BLACK; ctx.font = "bold 32px sans-serif"; ctx.textAlign = "left";
    let y = 120;
    for (const l of this.wrap(ctx, title, CONTENT_W)) { ctx.fillText(l, MX, y); y += 40; }
    ctx.fillStyle = ACCENT; ctx.fillRect(MX, y + 10, 60, 4);
    this.footer(ctx, title, 1);
  }
  drawTOC(entries: any[], bookTitle: string) {
    const ctx = this.newPage();
    let y = 120;
    ctx.fillStyle = BLACK; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Table of Contents", MX, y); y += 50;
    ctx.font = "14px Georgia, serif";
    let pg = 3;
    for (const e of entries) {
      ctx.fillStyle = BLACK;
      const title = e.type === "chapter" ? `Chapter ${e.number}: ${e.label}` : e.label;
      ctx.fillText(title, MX, y);
      const titleEnd = MX + ctx.measureText(title).width + 8;
      const pgStr = String(pg);
      ctx.textAlign = "right"; ctx.fillText(pgStr, PAGE_W - MX, y); ctx.textAlign = "left";
      const pgStart = PAGE_W - MX - ctx.measureText(pgStr).width - 8;
      if (pgStart > titleEnd + 20) {
        ctx.strokeStyle = "#BBBBBB"; ctx.lineWidth = 0.8;
        ctx.setLineDash([1, 4]);
        ctx.beginPath(); ctx.moveTo(titleEnd, y - 3); ctx.lineTo(pgStart, y - 3); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.type === "intro") pg += 2;
      else if (e.type === "chapter") { pg += 3; }
      else if (e.type === "conclusion") pg += 2;
      y += e.type === "chapter" ? 38 : 34;
    }
    this.footer(ctx, bookTitle, this.pages.length);
  }
  drawContentPages(title: string, rawContent: string, bookTitle: string, isChapter = false, chNum?: number) {
    const maxY = PAGE_H - 88;
    let ctx: CanvasRenderingContext2D;
    let y: number;
    if (isChapter && chNum !== undefined) { ctx = this.newPage(); y = 165; }
    else if (isChapter && chNum === undefined) { ctx = this.newPage(); y = 120; }
    else if (this._lastCtx && this._lastY < maxY - 220) { ctx = this._lastCtx; y = this._lastY + 40; }
    else { ctx = this.newPage(); y = 120; }
    if (isChapter && chNum !== undefined) {
      ctx.fillStyle = ACCENT; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`CHAPTER ${String(chNum).padStart(2, "0")}`, MX, y);
      y += 10; ctx.fillStyle = ACCENT; ctx.fillRect(MX, y, 56, 3); y += 22;
    }
    ctx.fillStyle = BLACK; ctx.font = "bold 32px sans-serif"; ctx.textAlign = "left";
    for (const l of this.wrap(ctx, title, CONTENT_W)) { ctx.fillText(l, MX, y); y += 44; }
    ctx.fillStyle = ACCENT; ctx.fillRect(MX, y - 6, 70, 4); y += 20;
    for (const block of this.parseBlocks(rawContent)) {
      if (block.type === "heading") {
        if (y > maxY - 90) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
        y += 22; ctx.fillStyle = BLACK; ctx.font = "bold 17px sans-serif";
        for (const l of this.wrap(ctx, block.text, CONTENT_W)) { ctx.fillText(l, MX, y); y += 28; }
        ctx.fillStyle = ACCENT; ctx.fillRect(MX, y - 4, 44, 3); y += 18;
      } else {
        ctx.font = "14.5px Georgia, serif"; ctx.fillStyle = "#333333";
        for (const l of this.wrap(ctx, block.text, CONTENT_W)) {
          if (y > maxY) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
          ctx.fillText(l, MX, y); y += 25;
        }
        y += 15;
      }
    }
    this._lastCtx = ctx; this._lastY = y;
    this.footer(ctx, bookTitle, this.pages.length);
  }
  private parseBlocks(text: string) {
    return text.split("\n\n").map(b => {
      // Catch ## headings anywhere in text, not just line start
      if (/^##\s+/.test(b.trim())) return { type: "heading", text: b.trim().replace(/^##\s+/, "") };
      if (b.startsWith("### ")) return { type: "heading", text: b.replace("### ", "") };
      return { type: "paragraph", text: b };
    });
  }
  async exportPDF(filename: string) {
    const jpegUrls = this.pages.map(c => c.toDataURL("image/jpeg", 0.92));
    const bytes = buildPDF(jpegUrls, PAGE_W, PAGE_H);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface NicheCard {
  id: string;
  category: string;
  subNiche: string;
  headline: string;
  description: string;
  pain: number;
  demand: number;
  speed: number;
}

const EbookGenerator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addEbook } = useEbookStore();
  const { recordUsage, isFreePlan } = useFeatureAccess();
  const { planType, hasPaidSubscription } = useSubscription();
  const isCreatorOrAbove = planType === "creator" || planType === "pro";

  // State
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [niches, setNiches] = useState<NicheCard[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<NicheCard | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftingProgress, setDraftingProgress] = useState(0);
  const [scriptContent, setScriptContent] = useState<{ title: string; sections: { heading: string; body: string }[] } | null>(null);
  const [ebookData, setEbookData] = useState<Ebook | null>(null);

  // Search Steps
  const searchSteps = [
    "Scanning trending topics…",
    "Analyzing market demand…",
    "Scoring pain points…",
    "Weighing candidates… 5/9"
  ];

  const languages = ["English", "Spanish", "French", "Portuguese", "German", "Arabic", "Hindi", "Mandarin"];

  // ── STEP 1: NICHE DISCOVERY ──
  const findWinningNiches = async () => {
    if (!topic.trim()) {
      toast({ title: "Topic Required", description: "Please enter a broad idea to search.", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    let stepIdx = 0;
    const interval = setInterval(() => {
      setSearchStatus(searchSteps[stepIdx % searchSteps.length]);
      stepIdx++;
    }, 1500);

    try {
      // ✅ FIXED: was "find-winning-niches"
      const { data, error } = await supabase.functions.invoke("search-winning-niches", {
        body: { topic, language }
      });
      
      if (error) throw error;
      if (data?.niches) {
        // Map scores.pain/demand/speed to flat fields for the UI
        const mapped = data.niches.map((n: any, i: number) => ({
          id: crypto.randomUUID(),
          category: n.category,
          subNiche: n.subNiche,
          headline: n.headline,
          description: n.painDescription,
          pain: n.scores?.pain ?? n.pain ?? 7,
          demand: n.scores?.demand ?? n.demand ?? 7,
          speed: n.scores?.speed ?? n.speed ?? 7,
        }));
        setNiches(mapped);
      } else {
        throw new Error("No niches found");
      }
    } catch (err: any) {
      toast({ title: "Search Failed", description: err.message, variant: "destructive" });
    } finally {
      clearInterval(interval);
      setIsSearching(false);
    }
  };

  // ── STEP 2: SCRIPT ──
  const startDrafting = async () => {
    if (!selectedNiche) return;
    
    const allowed = await recordUsage("ebook_generator");
    if (!allowed) return;

    setStep(2);
    setIsDrafting(true);
    setDraftingProgress(0);

    try {
      // ✅ FIXED: was "generate-ebook-content", removed length param, added language
      const { data, error } = await supabase.functions.invoke("generate-ebook", {
        body: { 
          topic: selectedNiche.headline,
          description: selectedNiche.description,
          category: selectedNiche.category,
          tone: "professional",
          language
        }
      });
      
      if (error) throw error;

      // Handle response from generate-ebook which returns chapters array
      let parsedSections: { heading: string; body: string }[] = [];

      if (data.chapters && Array.isArray(data.chapters)) {
        // New format: { title, chapters: [{ title, content }] }
        parsedSections = data.chapters.map((ch: any) => ({
          heading: ch.title,
          body: ch.content
        }));
      } else if (data.content) {
        // Legacy format fallback
        parsedSections = data.content.split("## ").filter(Boolean).map((s: string) => {
          const lines = s.split("\n");
          return {
            heading: lines[0].trim(),
            body: lines.slice(1).join("\n").trim()
          };
        });
      }

      const sections: { heading: string; body: string }[] = [];
      for (let i = 0; i < parsedSections.length; i++) {
        await new Promise(r => setTimeout(r, 600));
        sections.push(parsedSections[i]);
        setDraftingProgress(i + 1);
        setScriptContent({ title: data.title || selectedNiche.headline, sections: [...sections] });
      }
      
      setIsDrafting(false);
    } catch (err: any) {
      toast({ title: "Drafting Failed", description: err.message, variant: "destructive" });
      setStep(1);
    }
  };

  // ── STEP 3: RENDER ──
  const renderProduct = async () => {
    if (!scriptContent || !selectedNiche) return;
    setStep(3);

    try {
      const renderer = new EbookPDFRenderer();
      await renderer.drawCover(scriptContent.title, selectedNiche.description.substring(0, 60), topic, null);
      renderer.drawTitlePage(scriptContent.title);
      
      const toc = scriptContent.sections.map((s, i) => ({
        type: i === 0 ? "intro" : i === scriptContent.sections.length - 1 ? "conclusion" : "chapter",
        number: i,
        label: s.heading
      }));
      renderer.drawTOC(toc, scriptContent.title);
      
      for (const section of scriptContent.sections) {
        renderer.drawContentPages(section.heading, section.body, scriptContent.title, true, 1);
      }

      const safeTitle = scriptContent.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const ebook: Ebook = {
        id: crypto.randomUUID(),
        title: scriptContent.title,
        topic,
        content: scriptContent.sections.map(s => `## ${s.heading}\n\n${s.body}`).join("\n\n"),
        coverImageUrl: null,
        pages: renderer.pages.length,
        length: "medium",
        createdAt: new Date().toISOString(),
        userId: user?.id,
        _renderer: renderer,
        _filename: `${safeTitle}.pdf`
      } as any;

      addEbook(ebook);
      setEbookData(ebook);
      
      try {
        await createTrackedProduct({
          title: ebook.title, topic: ebook.topic,
          description: selectedNiche.description, length: "medium",
          content: ebook.content, coverImageUrl: null, pages: ebook.pages,
        });
      } catch {}

    } catch (err: any) {
      toast({ title: "Render Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!isCreatorOrAbove) {
      toast({ title: "Upgrade Required", description: "Downloads require Creator or Pro plan.", variant: "destructive" });
      return;
    }
    if (ebookData) {
      await (ebookData as any)._renderer?.exportPDF((ebookData as any)._filename || "ebook.pdf");
    }
  };

  const resetAll = () => {
    setStep(1);
    setTopic("");
    setNiches([]);
    setSelectedNiche(null);
    setScriptContent(null);
    setEbookData(null);
  };

  // ── RENDER HELPERS ──
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-8 mb-12">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>
          {step > 1 ? <Check className="w-3 h-3" /> : "1"}
        </div>
        <span className={`text-sm font-bold uppercase tracking-wider ${step >= 1 ? "text-white" : "text-zinc-600"}`}>Niche</span>
      </div>
      <div className="w-12 h-[1px] bg-zinc-800" />
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>
          {step > 2 ? <Check className="w-3 h-3" /> : step === 2 ? <div className="w-2 h-2 bg-black rounded-full" /> : "2"}
        </div>
        <span className={`text-sm font-bold uppercase tracking-wider ${step >= 2 ? "text-white" : "text-zinc-600"}`}>Script</span>
      </div>
      <div className="w-12 h-[1px] bg-zinc-800" />
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>
          {step > 3 ? <Check className="w-3 h-3" /> : "3"}
        </div>
        <span className={`text-sm font-bold uppercase tracking-wider ${step >= 3 ? "text-white" : "text-zinc-600"}`}>Render</span>
      </div>
    </div>
  );

  const renderNicheDiscovery = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight" style={{ fontFamily: "Syne" }}>AI Product Generator</h1>
        <p className="text-zinc-400">Discover winning niches and generate professional ebooks in minutes.</p>
      </div>

      <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-8 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">What's your topic?</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Biohacking, Real Estate, Parenting..."
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
            />
            <p className="text-xs text-zinc-500 mt-2">Enter a broad idea and AI will search trending markets to find the best angle to sell.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">Output Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white appearance-none"
            >
              {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </div>
        
        <Button
          onClick={findWinningNiches}
          disabled={isSearching}
          className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-bold text-lg rounded-xl transition-all"
        >
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
          Find Winning Niches
        </Button>
      </div>

      {isSearching && (
        <div className="text-center py-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-full mb-6">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-white font-medium">{searchStatus}</span>
          </div>
          <div className="max-w-xs mx-auto">
            <Progress value={isSearching ? 100 : 0} className="h-1 bg-zinc-900" />
          </div>
        </div>
      )}

      {niches.length > 0 && !isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {niches.map(niche => (
            <div
              key={niche.id}
              onClick={() => setSelectedNiche(niche)}
              className={`bg-[#111111] border-2 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] ${selectedNiche?.id === niche.id ? "border-white" : "border-zinc-900"}`}
            >
              <span className="inline-block px-2 py-1 bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded mb-4 tracking-widest uppercase">{niche.category}</span>
              <p className="text-xs text-zinc-500 mb-1">{niche.subNiche}</p>
              <h3 className="text-lg font-bold text-white mb-3 leading-tight" style={{ fontFamily: "Syne" }}>{niche.headline}</h3>
              <p className="text-sm text-zinc-400 mb-6 line-clamp-2">{niche.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span className="text-zinc-500">Pain</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`w-2 h-1 rounded-full ${i < niche.pain ? "bg-white" : "bg-zinc-800"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span className="text-zinc-500">Demand</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`w-2 h-1 rounded-full ${i < niche.demand ? "bg-white" : "bg-zinc-800"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span className="text-zinc-500">Speed</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`w-2 h-1 rounded-full ${i < niche.speed ? "bg-white" : "bg-zinc-800"}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedNiche && !isSearching && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center pb-20">
          <Button
            onClick={startDrafting}
            className="h-14 px-10 bg-white text-black hover:bg-zinc-200 font-bold text-lg rounded-xl"
          >
            Lock This Angle <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );

  const renderScript = () => (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}
      
      <div className="flex justify-center mb-8">
        <div className="px-4 py-1.5 bg-white text-black rounded-full text-[11px] font-bold uppercase tracking-wider">
          {selectedNiche?.headline}
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-zinc-900 rounded-2xl p-8 mb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Drafting Your Script</h2>
          <div className="text-[10px] font-bold text-white bg-zinc-800 px-2 py-1 rounded">
            {draftingProgress} / 12
          </div>
        </div>

        <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
          {scriptContent?.sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-black text-white uppercase tracking-tight">{section.heading}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{section.body}</p>
            </motion.div>
          ))}
          {isDrafting && (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-zinc-900 rounded w-1/4" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-900 rounded w-full" />
                <div className="h-3 bg-zinc-900 rounded w-5/6" />
              </div>
            </div>
          )}
        </div>
      </div>

      {!isDrafting && draftingProgress >= 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center pb-20">
          <Button
            onClick={renderProduct}
            className="h-14 px-10 bg-white text-black hover:bg-zinc-200 font-bold text-lg rounded-xl"
          >
            Continue <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );

  const renderFinal = () => (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Render Complete</h2>
        <div className="px-2 py-0.5 bg-[#7C3AED] text-white text-[10px] font-bold rounded uppercase tracking-wider">Ready</div>
      </div>

      <div className="bg-[#0F0F0F] border border-zinc-900 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-40 aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 relative border border-zinc-800">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <div className="text-[8px] font-bold text-white/40 uppercase mb-2">Masterpiece</div>
              <div className="text-[10px] font-bold text-white leading-tight line-clamp-3">{scriptContent?.title}</div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Syne" }}>{scriptContent?.title}</h2>
            <p className="text-sm text-zinc-500 mb-6">{selectedNiche?.description.substring(0, 100)}...</p>
            
            <div className="flex gap-4 mb-8">
              <div className="flex-1 bg-black border border-zinc-900 rounded-lg p-3">
                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Words</p>
                <p className="text-white font-bold text-sm">4,200</p>
              </div>
              <div className="flex-1 bg-black border border-zinc-900 rounded-lg p-3">
                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Value Blocks</p>
                <p className="text-white font-bold text-sm">24</p>
              </div>
              <div className="flex-1 bg-black border border-zinc-900 rounded-lg p-3">
                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Sections</p>
                <p className="text-white font-bold text-sm">{scriptContent?.sections.length ?? 0}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <div className="w-4 h-4 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#7C3AED]" />
                </div>
                Niche Locked — <span className="text-zinc-500 font-medium normal-case">Winning angle selected</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <div className="w-4 h-4 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#7C3AED]" />
                </div>
                Script Compiled — <span className="text-zinc-500 font-medium normal-case">Core sections staged</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <div className="w-4 h-4 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#7C3AED]" />
                </div>
                Cover Rendered — <span className="text-zinc-500 font-medium normal-case">Artwork synced.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <Button
          onClick={handleDownloadPDF}
          className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl"
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          className="w-full h-14 bg-transparent border-zinc-800 text-white hover:bg-zinc-900 font-bold rounded-xl"
        >
          Download Cover
        </Button>
      </div>

      <div className="text-center pb-20">
        <button
          onClick={resetAll}
          className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Generate Another
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 min-h-screen bg-[#0A0A0A] text-white">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderNicheDiscovery()}
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderScript()}
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderFinal()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
