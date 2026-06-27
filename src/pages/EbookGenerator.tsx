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
const BODY_FONT   = "15px Georgia, serif";
const BODY_COLOR  = "#1A1A1A";
const HEAD_COLOR  = "#111111";
const RULE_COLOR  = "#CCCCCC";
const SMALL_COLOR = "#888888";
const LINE_H      = 27;
const PARA_GAP    = 18;
const HEAD_GAP    = 32;
const MX2         = 72;
const CONTENT_W2  = PAGE_W - MX2 * 2;
const TOP_Y       = 64;
const FOOTER_Y    = PAGE_H - 44;
const MAX_CONTENT = FOOTER_Y - 20;

// ─── AI LEAKAGE PATTERNS ─────────────────────────────────────────────────────
const AI_LEAKAGE_PATTERNS: RegExp[] = [
  /^(however,?\s+)?(to better adhere|to follow the instructions|to eliminate the word)/i,
  /^conclusion is not allowed/i,
  /^(however,?\s+)?since the last (two |few )?sections?/i,
  /it is essential to (rephrase|replace|rewrite|revise) the last/i,
  /replace the last (part|section|paragraph) of (this |the )?text/i,
  /to follow the instructions provided/i,
  /the last (two |few )?sections? (of the text )?(still )?contain(s)? (some )?repetition/i,
  /^(however,?\s+)?since (this|the) (chapter|text|section|content) (still |already )?contains?/i,
  /^(this|the) (chapter|text|section|content|paragraph) (has been|was|is being|needs to be) (rewritten|revised|rephrased|updated|improved)/i,
  /\bi (have|'ve) (rewritten|rephrased|revised|updated|improved|edited|humanized|removed|replaced)/i,
  /^here is the (rewritten|revised|improved|final|updated|humanized)/i,
  /^(rewritten|revised|improved) (chapter|version|text|content):/i,
  /as per (your|the) (instructions?|requirements?|format|guidelines?)/i,
  /^i (have|'ve) (also )?(removed|eliminated|replaced|stripped|avoided|ensured)/i,
  /\bper (your|the) (instructions?|requirements?|format)\b/i,
  /\b(as instructed|as requested|as specified|as outlined)\b/i,
  /^(final thought|final thoughts|final note|editor.?s? note):/i,
  /^here is (a |the )?(revised|rewritten|updated|improved|final)/i,
  /^note:\s*(the|this|i|to)/i,
  /^(however,?\s+)?it is essential to (rephrase|replace)/i,
  /\b(to better adhere to the format|eliminate the word.{0,20}in conclusion|the last (paragraph|section) was rephrased|let.?s provide a final thought)\b/i,
  /\b(as (per|per the) (the )?(instructions?|format|guidelines?|prompt)|following (the|your) instructions?)\b/i,
  /\b(rewritten to (avoid|remove|eliminate)|rephrased (to|for)|revised (to|for) (comply|follow|adhere))\b/i,
];

function isAILeakage(text: string): boolean {
  const t = text.trim();
  return AI_LEAKAGE_PATTERNS.some(p => p.test(t));
}

// ─── HELPER: Strip markdown from AI text ─────────────────────────────────────
function stripMarkdown(text: string): string {
  return (text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/`/g, "")
    .trim();
}

class EbookPDFRenderer {
  readonly pages: HTMLCanvasElement[] = [];
  private _lastCtx: CanvasRenderingContext2D | null = null;
  private _lastY: number = 0;
  private _bookTitle: string = "";

  private newPage(): CanvasRenderingContext2D {
    const c = document.createElement("canvas");
    c.width = PAGE_W; c.height = PAGE_H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    this.pages.push(c);
    return ctx;
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (ctx.measureText(candidate).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  private drawText(ctx: CanvasRenderingContext2D, line: string, x: number, y: number) {
    ctx.textAlign = "left";
    ctx.fillText(line, x, y);
  }

  private drawHeader(ctx: CanvasRenderingContext2D, title: string, pageNum: number) {
    ctx.strokeStyle = RULE_COLOR; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(MX2, TOP_Y); ctx.lineTo(PAGE_W - MX2, TOP_Y); ctx.stroke();
    ctx.fillStyle = SMALL_COLOR;
    ctx.font = "12px Georgia, serif";
    ctx.textAlign = "left";
    const shortTitle = title.length > 45 ? title.substring(0, 42) + "…" : title;
    ctx.fillText(shortTitle.toUpperCase(), MX2, TOP_Y - 8);
    ctx.textAlign = "right";
    ctx.fillText(String(pageNum), PAGE_W - MX2, TOP_Y - 8);
  }

  private drawFooter(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = RULE_COLOR; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(PAGE_W / 2 - 40, FOOTER_Y); ctx.lineTo(PAGE_W / 2 + 40, FOOTER_Y); ctx.stroke();
  }

  async drawCover(title: string, subtitle: string, _topic: string, img64: string | null) {
    this._bookTitle = title;
    const ctx = this.newPage();
    const w = PAGE_W, h = PAGE_H;
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#333333"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MX2, 48); ctx.lineTo(w - MX2, 48); ctx.stroke();

    if (img64) {
      try {
        const img = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = `data:image/png;base64,${img64}`; });
        ctx.drawImage(img, 0, 60, w, h * 0.45);
        const grad = ctx.createLinearGradient(0, 60, 0, h * 0.55);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(255,255,255,1)");
        ctx.fillStyle = grad; ctx.fillRect(0, 60, w, h * 0.5);
      } catch { /* keep white */ }
    }

    ctx.fillStyle = HEAD_COLOR; ctx.textAlign = "center";
    ctx.font = "bold 58px Georgia, serif";
    const titleLines = this.wrapText(ctx, title, w - 120);
    const lineH = 70;
    let ty = h * 0.42 - (titleLines.length * lineH) / 2;
    for (const l of titleLines) { ctx.fillText(l, w / 2, ty); ty += lineH; }

    ctx.strokeStyle = "#333333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2 - 50, ty + 16); ctx.lineTo(w / 2 + 50, ty + 16); ctx.stroke();

    if (subtitle) {
      const safe = subtitle.length > 100 ? subtitle.substring(0, 97) + "…" : subtitle;
      ctx.fillStyle = "#444444"; ctx.font = "italic 16px Georgia, serif"; ctx.textAlign = "center";
      let sy = ty + 44;
      for (const l of this.wrapText(ctx, safe, w - 180)) {
        if (sy < h - 80) { ctx.fillText(l, w / 2, sy); sy += 26; }
      }
    }

    ctx.strokeStyle = "#333333"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MX2, h - 48); ctx.lineTo(w - MX2, h - 48); ctx.stroke();
  }

  drawTitlePage(title: string) {
    this._bookTitle = title;
    const ctx = this.newPage();
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    ctx.font = "bold 44px Georgia, serif";
    const lines = this.wrapText(ctx, title, CONTENT_W2 - 20);
    const lineH = 62;
    const totalH = lines.length * lineH;
    let ty = (PAGE_H - totalH) / 2 - 20;

    ctx.fillStyle = HEAD_COLOR; ctx.textAlign = "center";
    for (const l of lines) { ctx.fillText(l, PAGE_W / 2, ty); ty += lineH; }

    ctx.fillStyle = SMALL_COLOR; ctx.font = "12px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText("Copyrighted Material", PAGE_W / 2, PAGE_H - 30);
    ctx.fillText("Copyrighted Material", PAGE_W / 2, 24);
  }

  drawTOC(toc: Array<{ type: string; number?: number; label: string }>, bookTitle: string) {
    const ctx = this.newPage();
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    let y = 100;
    ctx.fillStyle = HEAD_COLOR; ctx.font = "bold 36px Georgia, serif"; ctx.textAlign = "left";
    ctx.fillText("Contents", MX2, y); y += 60;

    let pg = 4;
    for (const e of toc) {
      if (y > PAGE_H - 80) break;
      const rawLabel = e.label.replace(/^Chapter\s*\d+\s*[:\-\.]\s*/i, "").trim();
      ctx.fillStyle = HEAD_COLOR;
      ctx.font = "15px Georgia, serif"; ctx.textAlign = "left";
      const numStr = e.number ? `${e.number}.` : "";
      if (numStr) ctx.fillText(numStr, MX2, y);
      const labelX = MX2 + 28;
      const labelMaxW = CONTENT_W2 - 60;
      ctx.font = "15px Georgia, serif";
      const labelLines = this.wrapText(ctx, rawLabel, labelMaxW);
      ctx.fillStyle = HEAD_COLOR; ctx.textAlign = "left";
      ctx.fillText(labelLines[0], labelX, y);
      if (labelLines[1]) ctx.fillText(labelLines[1], labelX, y + 20);
      ctx.fillStyle = HEAD_COLOR; ctx.font = "15px Georgia, serif"; ctx.textAlign = "right";
      ctx.fillText(String(pg), PAGE_W - MX2, y);
      pg += 3;
      y += labelLines[1] ? 52 : 36;
    }

    ctx.fillStyle = SMALL_COLOR; ctx.font = "12px Georgia, serif"; ctx.textAlign = "left";
    ctx.fillText("Copyrighted Material", MX2, PAGE_H - 24);
    ctx.textAlign = "center";
    ctx.fillText(bookTitle, PAGE_W / 2, PAGE_H - 24);
    ctx.textAlign = "right";
    ctx.fillText(String(this.pages.length), PAGE_W - MX2, PAGE_H - 24);
  }

  drawChapterSplash(_num: number, _title: string, _bookTitle: string) { /* no-op */ }

  drawContentPages(title: string, rawContent: string, bookTitle: string, isChapter = false, chNum?: number) {
    if (isChapter) this.trimOrphanPages();

    const state = { ctx: this.newPage(), y: isChapter ? 140 : TOP_Y + 24 };

    const newPageIfNeeded = (neededSpace: number) => {
      if (state.y > MAX_CONTENT - neededSpace) {
        this.drawFooter(state.ctx);
        state.ctx = this.newPage();
        this.drawHeader(state.ctx, bookTitle, this.pages.length);
        state.y = TOP_Y + 28;
      }
    };

    if (!isChapter) {
      this.drawHeader(state.ctx, bookTitle, this.pages.length);
    }

    if (isChapter && chNum !== undefined) {
      state.ctx.fillStyle = SMALL_COLOR;
      state.ctx.font = "12px Georgia, serif";
      state.ctx.textAlign = "left";
      state.ctx.fillText(`Chapter ${chNum}`, MX2, state.y - 40);
      state.ctx.strokeStyle = RULE_COLOR; state.ctx.lineWidth = 0.7;
      state.ctx.beginPath();
      state.ctx.moveTo(MX2, state.y - 28); state.ctx.lineTo(PAGE_W - MX2, state.y - 28);
      state.ctx.stroke();
    }

    const cleanTitle = title.replace(/^Chapter\s*\d+\s*[:\-\.]\s*/i, "").trim();
    state.ctx.fillStyle = HEAD_COLOR; state.ctx.font = "bold 28px Georgia, serif"; state.ctx.textAlign = "left";
    const titleLines = this.wrapText(state.ctx, cleanTitle, CONTENT_W2);
    for (const l of titleLines) { state.ctx.fillText(l, MX2, state.y); state.y += 38; }
    state.y += 24;

    for (const block of this.parseBlocks(rawContent)) {
      if (block.type === "heading") {
        newPageIfNeeded(80);
        state.y += HEAD_GAP;
        state.ctx.font = "bold 17px Georgia, serif";
        state.ctx.fillStyle = HEAD_COLOR;
        state.ctx.textAlign = "left";
        const hLines = this.wrapText(state.ctx, block.text, CONTENT_W2);
        for (const l of hLines) {
          state.ctx.font = "bold 17px Georgia, serif";
          state.ctx.fillStyle = HEAD_COLOR;
          state.ctx.fillText(l, MX2, state.y);
          state.y += 24;
        }
        state.y += 10;

      } else if (block.type === "pullquote") {
        newPageIfNeeded(60);
        state.y += 14;
        state.ctx.fillStyle = "#444444"; state.ctx.font = "italic 14px Georgia, serif"; state.ctx.textAlign = "left";
        const qLines = this.wrapText(state.ctx, `\u201c${block.text}\u201d`, CONTENT_W2 - 60);
        for (const l of qLines) {
          newPageIfNeeded(20);
          state.ctx.font = "italic 14px Georgia, serif";
          state.ctx.fillStyle = "#444444";
          this.drawText(state.ctx, l, MX2 + 30, state.y);
          state.y += 22;
        }
        state.y += 14;

      } else {
        state.ctx.font = BODY_FONT;
        state.ctx.fillStyle = BODY_COLOR;
        state.ctx.textAlign = "left";
        const lines = this.wrapText(state.ctx, block.text, CONTENT_W2);
        for (let i = 0; i < lines.length; i++) {
          newPageIfNeeded(LINE_H);
          state.ctx.font = BODY_FONT;
          state.ctx.fillStyle = BODY_COLOR;
          this.drawText(state.ctx, lines[i], MX2, state.y);
          state.y += LINE_H;
        }
        state.y += PARA_GAP;
      }
    }

    this.drawFooter(state.ctx);
    this._lastCtx = state.ctx; this._lastY = state.y;
  }

  private trimOrphanPages() {
    if (this.pages.length < 2) return;
    const last = this.pages[this.pages.length - 1];
    const ctx = last.getContext("2d")!;
    const sampleH = Math.floor(PAGE_H * 0.30);
    const data = ctx.getImageData(MX2, TOP_Y + 30, CONTENT_W2, sampleH).data;
    let nonWhitePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240) nonWhitePixels++;
    }
    if (nonWhitePixels < 80) { this.pages.pop(); this._lastCtx = null; this._lastY = 0; }
  }

  private parseBlocks(content: string): Array<{ type: string; text: string }> {
    const blocks: Array<{ type: string; text: string }> = [];

    const preprocessed = content
      .replace(/\*\*([^*\n]{4,80})\*\*[ \t]+([A-Z][^*\n]{10,})/g, "\n\n## $1\n\n$2")
      .replace(/([.!?])\s+\*\*([^*\n]{4,80})\*\*\s+([A-Z][^*\n]{10,})/g, "$1\n\n## $2\n\n$3")
      .replace(/(^#{2,3}\s+[^\n]+)\n([^#\n])/gm, "$1\n\n$2")
      .replace(/^(Text of )?(Part \d+\s*[-—]+\s*THE\s+\w+|THE INSIGHT|THE MECHANISM|THE EVIDENCE|THE COUNTER|THE EDGE)\s*$/gim, "")
      .replace(/^(The Insight|The Mechanism|The Evidence|The Counter|The Edge)\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n");

    for (const para of preprocessed.split(/\n\n+/)) {
      const t = para.trim();
      if (!t) continue;
      if (isAILeakage(t)) continue;
      if (/^Chapter:\s*[""]?.{3,120}[""]?\s*$/i.test(t)) continue;
      if (/^here is the (improved|rewritten|final|humanized)/i.test(t)) continue;
      if (/^(note:|editor.?s? note:|revision:)/i.test(t)) continue;
      if (/^(In conclusion|To summarize|In summary|To wrap up|As we've seen|As discussed)[,.]?/i.test(t)) continue;

      if (/^#{2,3}\s+/.test(t)) {
        const headingText = t.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "").split("\n")[0].trim();
        if (headingText.length > 3 && !isAILeakage(headingText)) {
          blocks.push({ type: "heading", text: headingText });
          const afterHeading = t.replace(/^#{2,3}\s+[^\n]+/, "").trim();
          if (afterHeading.length > 10 && !isAILeakage(afterHeading))
            blocks.push({ type: "body", text: afterHeading.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") });
        }
        continue;
      }

      if (/^\*\*([^*\n]{4,80})\*\*$/.test(t)) {
        const h = t.replace(/\*\*/g, "");
        if (!isAILeakage(h)) blocks.push({ type: "heading", text: h });
        continue;
      }

      const boldInline = t.match(/^\*\*([^*\n]{4,80})\*\*\s+(.{10,})/s);
      if (boldInline) {
        if (!isAILeakage(boldInline[1])) blocks.push({ type: "heading", text: boldInline[1] });
        const body = boldInline[2].trim().replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
        if (body && !isAILeakage(body)) blocks.push({ type: "body", text: body });
        continue;
      }

      if (t.startsWith(">")) {
        const raw = t.replace(/^>\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").trim()
          .replace(/^["\u201c]+/, "").replace(/["\u201d]+$/, "").trim();
        if (raw.length > 3 && !isAILeakage(raw)) blocks.push({ type: "pullquote", text: raw });
        continue;
      }

      const clean = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1");
      if (clean.length > 3 && !isAILeakage(clean)) blocks.push({ type: "body", text: clean });
    }

    return blocks;
  }

  async exportPDF(filename: string) {
    this.trimOrphanPages();
    const jpegUrls = this.pages.map(c => c.toDataURL("image/jpeg", 1.0));
    const bytes = buildPDF(jpegUrls, PAGE_W, PAGE_H);
    const blob = new Blob([bytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
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

// ─── SCORE BAR COLORS ────────────────────────────────────────────────────────
const SCORE_BAR_COLORS: Record<string, string> = {
  pain: "#EF4444",
  demand: "#00d4aa",
  speed: "#8B5CF6",
};

const EbookGenerator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addEbook } = useEbookStore();
  const { recordUsage, isFreePlan } = useFeatureAccess();
  const { planType, hasPaidSubscription } = useSubscription();
  const isCreatorOrAbove = planType === "creator" || planType === "pro";

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

  const searchSteps = [
    "Scanning trending topics…",
    "Analyzing market demand…",
    "Scoring pain points…",
    "Weighing candidates… 5/9"
  ];

  const languages = ["English", "Spanish", "French", "Portuguese", "German", "Arabic", "Hindi", "Mandarin"];

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
      const { data, error } = await supabase.functions.invoke("search-winning-niches", {
        body: { topic, language }
      });
      if (error) throw error;
      if (data?.niches) {
        // FIX: Strip markdown from all text fields on the frontend as safety layer
        const mapped = data.niches.map((n: any) => ({
          id: crypto.randomUUID(),
          category: stripMarkdown(n.category),
          subNiche: stripMarkdown(n.subNiche),
          headline: stripMarkdown(n.headline),
          description: stripMarkdown(n.painDescription),
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

  const startDrafting = async () => {
    if (!selectedNiche) return;
    const allowed = await recordUsage("ebook_generator");
    if (!allowed) return;
    setStep(2);
    setIsDrafting(true);
    setDraftingProgress(0);
    try {
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
      let parsedSections: { heading: string; body: string }[] = [];
      if (data.chapters && Array.isArray(data.chapters)) {
        parsedSections = data.chapters.map((ch: any) => ({
          heading: ch.title.replace(/^Chapter\s*\d+\s*[:\-\.]\s*/i, "").trim(),
          body: ch.content
        }));
      } else if (data.content) {
        parsedSections = data.content.split("## ").filter(Boolean).map((s: string) => {
          const lines = s.split("\n");
          return { heading: lines[0].trim(), body: lines.slice(1).join("\n").trim() };
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

  const renderProduct = async () => {
    if (!scriptContent || !selectedNiche) return;
    setStep(3);
    try {
      const renderer = new EbookPDFRenderer();
      await renderer.drawCover(scriptContent.title, selectedNiche.headline, topic, null);
      renderer.drawTitlePage(scriptContent.title);
      const toc = scriptContent.sections.map((s, i) => ({ type: "chapter", number: i + 1, label: s.heading }));
      renderer.drawTOC(toc, scriptContent.title);
      for (let i = 0; i < scriptContent.sections.length; i++) {
        renderer.drawContentPages(scriptContent.sections[i].heading, scriptContent.sections[i].body, scriptContent.title, true, i + 1);
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
    setStep(1); setTopic(""); setNiches([]); setSelectedNiche(null);
    setScriptContent(null); setEbookData(null);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-8 mb-12">
      {[{ label: "Niche", n: 1 }, { label: "Script", n: 2 }, { label: "Render", n: 3 }].map((s, i) => (
        <>
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>
              {step > s.n ? <Check className="w-3 h-3" /> : s.n}
            </div>
            <span className={`text-sm font-bold uppercase tracking-wider ${step >= s.n ? "text-white" : "text-zinc-600"}`}>{s.label}</span>
          </div>
          {i < 2 && <div key={`div-${i}`} className="w-12 h-[1px] bg-zinc-800" />}
        </>
      ))}
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
              onKeyDown={(e) => e.key === "Enter" && findWinningNiches()}
              placeholder="I don't know, you can find a good topic for me."
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
              <span className="inline-block px-2 py-1 bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded mb-4 tracking-widest uppercase">
                {niche.category}
              </span>
              {/* FIX: subNiche and headline are now stripped of ** markdown */}
              <p className="text-xs text-zinc-500 mb-1">{niche.subNiche}</p>
              <h3 className="text-lg font-bold text-white mb-3 leading-tight" style={{ fontFamily: "Syne" }}>
                {niche.headline}
              </h3>
              <p className="text-sm text-zinc-400 mb-6 line-clamp-2">{niche.description}</p>

              {/* FIX: Replaced broken dots with proper colored progress bars */}
              <div className="space-y-3">
                {(["pain", "demand", "speed"] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{key}</span>
                      <span className="text-[10px] font-bold text-zinc-400">{niche[key]}/10</span>
                    </div>
                    <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '5px', width: '100%' }}>
                      <div style={{
                        background: SCORE_BAR_COLORS[key],
                        width: `${niche[key] * 10}%`,
                        height: '5px',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                        opacity: selectedNiche?.id === niche.id ? 1 : 0.7,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedNiche && !isSearching && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center pb-20">
          <Button onClick={startDrafting} className="h-14 px-10 bg-white text-black hover:bg-zinc-200 font-bold text-lg rounded-xl">
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
          <div className="text-[10px] font-bold text-white bg-zinc-800 px-2 py-1 rounded">{draftingProgress} / 12</div>
        </div>
        <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
          {scriptContent?.sections.map((section, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
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
          <Button onClick={renderProduct} className="h-14 px-10 bg-white text-black hover:bg-zinc-200 font-bold text-lg rounded-xl">
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
              {["Niche Locked — Winning angle selected", "Script Compiled — Core sections staged", "Cover Rendered — Artwork synced."].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <div className="w-4 h-4 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#7C3AED]" />
                  </div>
                  {item.split(" — ")[0]} — <span className="text-zinc-500 font-medium normal-case">{item.split(" — ")[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3 mb-8">
        <Button onClick={handleDownloadPDF} className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl">
          Download PDF
        </Button>
        <Button variant="outline" className="w-full h-14 bg-transparent border-zinc-800 text-white hover:bg-zinc-900 font-bold rounded-xl">
          Download Cover
        </Button>
      </div>
      <div className="text-center pb-20">
        <button onClick={resetAll} className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
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
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {renderNicheDiscovery()}
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {renderScript()}
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {renderFinal()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
