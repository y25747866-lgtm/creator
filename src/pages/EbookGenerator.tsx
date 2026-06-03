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
// Premium editorial style — clean white, serif typography, wide margins
// Inspired by traditionally published nonfiction books
const BODY_FONT   = "15px Georgia, serif";
const BODY_COLOR  = "#1A1A1A";
const HEAD_COLOR  = "#111111";
const RULE_COLOR  = "#CCCCCC";
const SMALL_COLOR = "#888888";
const LINE_H      = 27;   // generous line height for readability
const PARA_GAP    = 18;   // space between paragraphs
const HEAD_GAP    = 32;   // space above subheadings
const MX2         = 72;   // wider inner margins for premium feel
const CONTENT_W2  = PAGE_W - MX2 * 2;
const TOP_Y       = 64;   // header zone height
const FOOTER_Y    = PAGE_H - 44;
const MAX_CONTENT = FOOTER_Y - 20;

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

  // Wrap text into lines that fit within maxW — always measures with current ctx font
  private wrapJustified(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    // Normalise: collapse multiple spaces, trim
    const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      // If even a single word is wider than maxW, still push it alone to avoid infinite loops
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

  // Draw justified text — last line always left-aligned
  // Guard: if computed gap is negative (word wider than line) or > 40px (too sparse), fall back to left-align
  private drawJustified(ctx: CanvasRenderingContext2D, line: string, isLast: boolean, x: number, y: number, maxW: number) {
    const words = line.split(" ").filter(Boolean);
    if (words.length <= 1 || isLast) {
      ctx.textAlign = "left";
      ctx.fillText(line, x, y);
      return;
    }
    const totalWordW = words.reduce((s, w) => s + ctx.measureText(w).width, 0);
    const gap = (maxW - totalWordW) / (words.length - 1);
    // Safety: if gap is unreasonable, just left-align
    if (gap < 0 || gap > 40) {
      ctx.textAlign = "left";
      ctx.fillText(words.join(" "), x, y);
      return;
    }
    let cx = x;
    for (const w of words) {
      ctx.fillText(w, cx, y);
      cx += ctx.measureText(w).width + gap;
    }
  }

  // Header rule line at top of each content page
  private drawHeader(ctx: CanvasRenderingContext2D, title: string, pageNum: number) {
    // Top rule
    ctx.strokeStyle = RULE_COLOR; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(MX2, TOP_Y); ctx.lineTo(PAGE_W - MX2, TOP_Y); ctx.stroke();
    // Left: book title (small caps style)
    ctx.fillStyle = SMALL_COLOR; ctx.font = "10px Georgia, serif"; ctx.textAlign = "left";
    const shortTitle = title.length > 45 ? title.substring(0, 42) + "…" : title;
    ctx.fillText(shortTitle.toUpperCase(), MX2, TOP_Y - 8);
    // Right: page number
    ctx.textAlign = "right";
    ctx.fillText(String(pageNum), PAGE_W - MX2, TOP_Y - 8);
  }

  // Footer rule line at bottom
  private drawFooter(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = RULE_COLOR; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(PAGE_W / 2 - 40, FOOTER_Y); ctx.lineTo(PAGE_W / 2 + 40, FOOTER_Y); ctx.stroke();
  }

  // ── COVER ────────────────────────────────────────────────────────────────────
  // Clean white editorial cover — no purple, no gradients
  async drawCover(title: string, subtitle: string, _topic: string, img64: string | null) {
    this._bookTitle = title;
    const ctx = this.newPage();
    const w = PAGE_W, h = PAGE_H;
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, w, h);

    // Thin top rule
    ctx.strokeStyle = "#333333"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MX2, 48); ctx.lineTo(w - MX2, 48); ctx.stroke();

    // If cover image provided — show as background with overlay
    if (img64) {
      try {
        const img = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = `data:image/png;base64,${img64}`; });
        // Draw image in top half
        ctx.drawImage(img, 0, 60, w, h * 0.45);
        // Fade overlay
        const grad = ctx.createLinearGradient(0, 60, 0, h * 0.55);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(255,255,255,1)");
        ctx.fillStyle = grad; ctx.fillRect(0, 60, w, h * 0.5);
      } catch { /* no image, keep white */ }
    }

    // Title — large elegant serif, centered, split by word groups for rhythm
    ctx.fillStyle = HEAD_COLOR; ctx.textAlign = "center";
    ctx.font = "bold 58px Georgia, serif";
    const titleLines = this.wrapJustified(ctx, title, w - 120);
    const lineH = 70;
    let ty = h * 0.42 - (titleLines.length * lineH) / 2;
    for (const l of titleLines) { ctx.fillText(l, w / 2, ty); ty += lineH; }

    // Short rule under title
    ctx.strokeStyle = "#333333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2 - 50, ty + 16); ctx.lineTo(w / 2 + 50, ty + 16); ctx.stroke();

    // Subtitle — italic, smaller
    if (subtitle) {
      const safe = subtitle.length > 100 ? subtitle.substring(0, 97) + "…" : subtitle;
      ctx.fillStyle = "#444444"; ctx.font = "italic 16px Georgia, serif"; ctx.textAlign = "center";
      let sy = ty + 44;
      for (const l of this.wrapJustified(ctx, safe, w - 180)) {
        if (sy < h - 80) { ctx.fillText(l, w / 2, sy); sy += 26; }
      }
    }

    // Bottom thin rule
    ctx.strokeStyle = "#333333"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MX2, h - 48); ctx.lineTo(w - MX2, h - 48); ctx.stroke();
  }

  // ── TITLE PAGE ───────────────────────────────────────────────────────────────
  // Elegant centered serif — exactly like Image 1
  drawTitlePage(title: string) {
    this._bookTitle = title;
    const ctx = this.newPage();
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Split title into natural word groups for stacked display
    const words = title.split(" ");
    const lines: string[] = [];
    ctx.font = "bold 44px Georgia, serif";
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > CONTENT_W2 - 20 && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);

    // Vertically center the title block
    const lineH = 62;
    const totalH = lines.length * lineH;
    let ty = (PAGE_H - totalH) / 2 - 20;

    ctx.fillStyle = HEAD_COLOR; ctx.textAlign = "center"; ctx.font = "bold 44px Georgia, serif";
    for (const l of lines) { ctx.fillText(l, PAGE_W / 2, ty); ty += lineH; }

    // Copyrighted Material footer (matches Image 1)
    ctx.fillStyle = SMALL_COLOR; ctx.font = "9px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText("Copyrighted Material", PAGE_W / 2, PAGE_H - 30);
    ctx.fillText("Copyrighted Material", PAGE_W / 2, 24);
  }

  // ── TABLE OF CONTENTS ────────────────────────────────────────────────────────
  // Clean numbered list — exactly like Image 2
  drawTOC(toc: Array<{ type: string; number?: number; label: string }>, bookTitle: string) {
    const ctx = this.newPage();
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // "Contents" heading — large, left-aligned
    let y = 100;
    ctx.fillStyle = HEAD_COLOR; ctx.font = "bold 36px Georgia, serif"; ctx.textAlign = "left";
    ctx.fillText("Contents", MX2, y); y += 60;

    let pg = 4;
    for (const e of toc) {
      if (y > PAGE_H - 80) break;

      // Strip "Chapter N:" prefix
      const rawLabel = e.label.replace(/^Chapter\s*\d+\s*[:\-\.]\s*/i, "").trim();

      // Number
      ctx.fillStyle = HEAD_COLOR;
      ctx.font = "15px Georgia, serif"; ctx.textAlign = "left";
      const numStr = e.number ? `${e.number}.` : "";
      if (numStr) { ctx.fillText(numStr, MX2, y); }

      // Label — may wrap to second line
      const labelX = MX2 + 28;
      const labelMaxW = CONTENT_W2 - 60;
      ctx.font = "15px Georgia, serif";
      const labelLines = this.wrapJustified(ctx, rawLabel, labelMaxW);

      ctx.fillStyle = HEAD_COLOR; ctx.textAlign = "left";
      ctx.fillText(labelLines[0], labelX, y);
      if (labelLines[1]) { ctx.fillText(labelLines[1], labelX, y + 20); }

      // Page number — right aligned
      const pgStr = String(pg);
      ctx.fillStyle = HEAD_COLOR; ctx.font = "15px Georgia, serif"; ctx.textAlign = "right";
      ctx.fillText(pgStr, PAGE_W - MX2, y);

      pg += 3;
      y += labelLines[1] ? 52 : 36;
    }

    // Footer
    ctx.fillStyle = SMALL_COLOR; ctx.font = "9px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText("Copyrighted Material", MX2, PAGE_H - 24);
    ctx.textAlign = "center";
    ctx.fillText(bookTitle, PAGE_W / 2, PAGE_H - 24);
    ctx.textAlign = "right";
    ctx.fillText(String(this.pages.length), PAGE_W - MX2, PAGE_H - 24);
  }

  // no-op — chapter heading renders in drawContentPages
  drawChapterSplash(_num: number, _title: string, _bookTitle: string) { /* no-op */ }

  // ── CONTENT PAGES ────────────────────────────────────────────────────────────
  drawContentPages(title: string, rawContent: string, bookTitle: string, isChapter = false, chNum?: number) {
    if (isChapter) this.trimOrphanPages();

    // Use a mutable ref object so ctx and y can flow across pages
    const state = { ctx: this.newPage(), y: isChapter ? 140 : TOP_Y + 24 };

    const newPageIfNeeded = (neededSpace: number) => {
      if (state.y > MAX_CONTENT - neededSpace) {
        this.drawFooter(state.ctx);
        state.ctx = this.newPage();
        this.drawHeader(state.ctx, bookTitle, this.pages.length);
        state.y = TOP_Y + 28;
      }
    };

    // Header rule — not on chapter opening page
    if (!isChapter) {
      this.drawHeader(state.ctx, bookTitle, this.pages.length);
    }

    // Chapter number label
    if (isChapter && chNum !== undefined) {
      state.ctx.fillStyle = SMALL_COLOR;
      state.ctx.font = "11px Georgia, serif"; state.ctx.textAlign = "left";
      state.ctx.fillText(`Chapter ${chNum}`, MX2, state.y - 40);
      // Thin rule below chapter number
      state.ctx.strokeStyle = RULE_COLOR; state.ctx.lineWidth = 0.7;
      state.ctx.beginPath();
      state.ctx.moveTo(MX2, state.y - 28); state.ctx.lineTo(PAGE_W - MX2, state.y - 28);
      state.ctx.stroke();
    }

    // Chapter title
    const cleanTitle = title.replace(/^Chapter\s*\d+\s*[:\-\.]\s*/i, "").trim();
    state.ctx.fillStyle = HEAD_COLOR; state.ctx.font = "bold 28px Georgia, serif"; state.ctx.textAlign = "left";
    const titleLines = this.wrapJustified(state.ctx, cleanTitle, CONTENT_W2);
    for (const l of titleLines) { state.ctx.fillText(l, MX2, state.y); state.y += 38; }
    state.y += 24;

    // Content blocks
    for (const block of this.parseBlocks(rawContent)) {
      if (block.type === "heading") {
        newPageIfNeeded(80);
        state.y += HEAD_GAP;
        state.ctx.font = "bold 17px Georgia, serif";
        state.ctx.fillStyle = HEAD_COLOR;
        state.ctx.textAlign = "left";
        const hLines = this.wrapJustified(state.ctx, block.text, CONTENT_W2);
        for (const l of hLines) {
          state.ctx.font = "bold 17px Georgia, serif";
          state.ctx.fillStyle = HEAD_COLOR;
          state.ctx.fillText(l, MX2, state.y);
          state.y += 24;
        }
        state.y += 10;

      } else if (block.type === "pullquote") {
        // Elegant italic indented quote — no box, just indented italic
        newPageIfNeeded(60);
        state.y += 14;
        state.ctx.fillStyle = "#444444"; state.ctx.font = "italic 14px Georgia, serif"; state.ctx.textAlign = "left";
        const qLines = this.wrapJustified(state.ctx, `\u201c${block.text}\u201d`, CONTENT_W2 - 60);
        for (const l of qLines) {
          newPageIfNeeded(20);
          state.ctx.fillText(l, MX2 + 30, state.y); state.y += 22;
        }
        state.y += 14;

      } else {
        // Body paragraph — justified
        // Always set font explicitly before measuring to avoid stale context state
        state.ctx.font = BODY_FONT;
        state.ctx.fillStyle = BODY_COLOR;
        state.ctx.textAlign = "left";
        const lines = this.wrapJustified(state.ctx, block.text, CONTENT_W2);
        for (let i = 0; i < lines.length; i++) {
          newPageIfNeeded(LINE_H);
          // Re-set font after potential page break (new ctx)
          state.ctx.font = BODY_FONT;
          state.ctx.fillStyle = BODY_COLOR;
          this.drawJustified(state.ctx, lines[i], i === lines.length - 1, MX2, state.y, CONTENT_W2);
          state.y += LINE_H;
        }
        state.y += PARA_GAP;
      }
    }

    this.drawFooter(state.ctx);
    this._lastCtx = state.ctx; this._lastY = state.y;
  }

  // Remove nearly blank trailing pages
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

  // ── CONTENT PARSER ───────────────────────────────────────────────────────────
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
      if (/^Chapter:\s*[""]?.{3,120}[""]?\s*$/i.test(t)) continue;
      if (/^here is the (improved|rewritten|final|humanized)/i.test(t)) continue;
      if (/^(note:|editor.?s? note:|revision:)/i.test(t)) continue;
      // ── AI leakage / meta-commentary filters ──────────────────────────────────
      if (/^however,?\s+(to better adhere|since the last|it is essential to replace|it is essential to rephrase)/i.test(t)) continue;
      if (/\b(to better adhere to the format|eliminate the word.{0,20}in conclusion|the last (paragraph|section) was rephrased|let.?s provide a final thought|conclusion is not allowed)\b/i.test(t)) continue;
      if (/\b(as (per|per the) (the )?(instructions?|format|guidelines?|prompt)|following (the|your) instructions?|per your (request|instructions?))\b/i.test(t)) continue;
      if (/\b(rewritten to (avoid|remove|eliminate)|rephrased (to|for)|revised (to|for) (comply|follow|adhere))\b/i.test(t)) continue;
      if (/\b(still contain(s)? some repetition|last two sections|the text still|some repetition,? it is essential)\b/i.test(t)) continue;
      if (/^(conclusion is not allowed|note:|please note:|important note:)/i.test(t)) continue;

      if (/^#{2,3}\s+/.test(t)) {
        const headingText = t.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "").split("\n")[0].trim();
        // Skip headings that are AI meta-commentary
        if (/conclusion is not allowed|let.?s provide a final|to better adhere|rephrase the last/i.test(headingText)) continue;
        if (headingText.length > 3) {
          blocks.push({ type: "heading", text: headingText });
          const afterHeading = t.replace(/^#{2,3}\s+[^\n]+/, "").trim();
          if (afterHeading.length > 10)
            blocks.push({ type: "body", text: afterHeading.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") });
        }
        continue;
      }

      if (/^\*\*([^*\n]{4,80})\*\*$/.test(t)) {
        blocks.push({ type: "heading", text: t.replace(/\*\*/g, "") });
        continue;
      }

      const boldInline = t.match(/^\*\*([^*\n]{4,80})\*\*\s+(.{10,})/s);
      if (boldInline) {
        blocks.push({ type: "heading", text: boldInline[1] });
        const body = boldInline[2].trim().replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
        if (body) blocks.push({ type: "body", text: body });
        continue;
      }

      // All blockquotes rendered as elegant italic pull quotes — no colored boxes
      if (t.startsWith(">")) {
        const raw = t.replace(/^>\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").trim()
          .replace(/^["\u201c]+/, "").replace(/["\u201d]+$/, "").trim();
        if (raw.length > 3) blocks.push({ type: "pullquote", text: raw });
        continue;
      }

      const clean = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1");
      if (clean.length > 3) blocks.push({ type: "body", text: clean });
    }

    return blocks;
  }

  async exportPDF(filename: string) {
    this.trimOrphanPages();
    const jpegUrls = this.pages.map(c => c.toDataURL("image/jpeg", 0.95));
    const bytes = buildPDF(jpegUrls, PAGE_W, PAGE_H);
    const blob = new Blob([bytes as any], { type: "application/pdf" });
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
        // Strip any "Chapter N:" prefix the AI may have added to titles
        parsedSections = data.chapters.map((ch: any) => ({
          heading: ch.title.replace(/^Chapter\s*\d+\s*[:\-\.]\s*/i, "").trim(),
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
      // Use the short headline as subtitle, not the full pain description
      const coverSubtitle = selectedNiche.headline || "";
      await renderer.drawCover(scriptContent.title, coverSubtitle, topic, null);
      renderer.drawTitlePage(scriptContent.title);
      
      const toc = scriptContent.sections.map((s, i) => ({
        type: "chapter",
        number: i + 1,
        label: s.heading
      }));
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
