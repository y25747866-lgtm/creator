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
    ctx.fillStyle = "#555555"; ctx.font = "10px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText(short, PAGE_W / 2, y + 8);
    ctx.fillStyle = "#555555"; ctx.font = "10px sans-serif"; ctx.textAlign = "right";
    ctx.fillText(String(n), PAGE_W - MX, y + 8);
    ctx.fillStyle = "#999999"; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Copyrighted Material", MX, y + 8);
  }

  // ── COVER ────────────────────────────────────────────────────────────────────
  async drawCover(title: string, subtitle: string, topic: string, img64: string | null) {
    const ctx = this.newPage();
    const w = PAGE_W, h = PAGE_H;

    ctx.fillStyle = BLACK; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, w, 8);

    // Top-right triangle decoration
    ctx.fillStyle = "#1A1A2E";
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.45);
    ctx.closePath(); ctx.fill();

    if (img64) {
      try {
        const img = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = `data:image/png;base64,${img64}`; });
        ctx.globalAlpha = 1;
        ctx.drawImage(img, 0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0,   "rgba(10,10,10,0.55)");
        grad.addColorStop(0.5, "rgba(10,10,10,0.45)");
        grad.addColorStop(1,   "rgba(10,10,10,0.82)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      } catch { /* keep dark bg */ }
    }

    // Title
    ctx.font = "bold 64px sans-serif"; ctx.textAlign = "center";
    const titleLines = this.wrap(ctx, title, w - 120);
    const lineH = 78;
    const blockH = titleLines.length * lineH;
    let ty = h * 0.38 - blockH / 2;
    ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 18;
    ctx.fillStyle = WHITE;
    for (const l of titleLines) { ctx.fillText(l, w / 2, ty); ty += lineH; }
    ctx.shadowBlur = 0;

    // Accent line
    ctx.fillStyle = ACCENT; ctx.fillRect(w / 2 - 60, ty - 14, 120, 5);

    // Subtitle
    const safeSubtitle = subtitle.length > 120 ? subtitle.substring(0, 117) + "..." : subtitle;
    if (safeSubtitle && !safeSubtitle.toLowerCase().includes("make me")) {
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "18px Georgia, serif"; ctx.textAlign = "center";
      let sy = ty + 22;
      for (const l of this.wrap(ctx, safeSubtitle, w - 160)) {
        if (sy < h - 100) { ctx.fillText(l, w / 2, sy); sy += 28; }
      }
    }

    // Bottom accent bar — no NexoraOS branding
    ctx.fillStyle = ACCENT; ctx.fillRect(0, h - 6, w, 6);
  }

  // ── TITLE PAGE ───────────────────────────────────────────────────────────────
  drawTitlePage(title: string) {
    const ctx = this.newPage();
    const w = PAGE_W, h = PAGE_H;
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BLACK; ctx.textAlign = "center";

    const words = title.toUpperCase().split(" ");
    const lines: string[] = [];
    let line = "";
    ctx.font = "bold 52px Georgia, serif";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > CONTENT_W - 40 && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);

    const totalH = lines.length * 68;
    const ornamentH = 100;
    const capHeight = 38;
    const visualBlockH = totalH + ornamentH;
    let ty = (h - visualBlockH) / 2 + capHeight;

    ctx.font = "bold 52px Georgia, serif";
    for (const l of lines) { ctx.fillText(l, w / 2, ty); ty += 68; }

    // Decorative divider
    const cx = w / 2;
    const dy = ty + 40;
    ctx.strokeStyle = BLACK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 100, dy); ctx.lineTo(cx - 24, dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 24, dy); ctx.lineTo(cx + 100, dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, dy - 8); ctx.lineTo(cx + 8, dy); ctx.lineTo(cx, dy + 8); ctx.lineTo(cx - 8, dy); ctx.closePath();
    ctx.fillStyle = BLACK; ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 108, dy, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 108, dy, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── TABLE OF CONTENTS ────────────────────────────────────────────────────────
  drawTOC(toc: Array<{ type: string; number?: number; label: string }>, bookTitle: string) {
    const ctx = this.newPage();
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    let y = 92;

    ctx.fillStyle = BLACK; ctx.font = "bold 36px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Table of Contents", MX, y); y += 18;
    ctx.fillStyle = ACCENT; ctx.fillRect(MX, y, 100, 4); y += 48;

    let pg = 4;
    for (const e of toc) {
      if (y > PAGE_H - 120) break;

      if (e.type === "chapter") {
        y += 6;
        ctx.fillStyle = ACCENT; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`CHAPTER ${String(e.number).padStart(2, "0")}`, MX, y);
        y += 20;
      }

      ctx.fillStyle = BLACK;
      ctx.font = e.type === "chapter" ? "bold 15px sans-serif" : "15px sans-serif";
      ctx.textAlign = "left";

      let label = e.label;
      while (ctx.measureText(label).width > CONTENT_W - 50 && label.length > 10) {
        label = label.substring(0, label.length - 4) + "…";
      }
      ctx.fillText(label, MX, y);

      const pgStr = String(pg);
      ctx.fillStyle = "#333333"; ctx.font = "14px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(pgStr, PAGE_W - MX, y);

      const titleEnd = MX + ctx.measureText(label).width + 8;
      const pgStart  = PAGE_W - MX - ctx.measureText(pgStr).width - 8;
      if (pgStart > titleEnd + 20) {
        ctx.strokeStyle = "#BBBBBB"; ctx.lineWidth = 0.8;
        ctx.setLineDash([1, 4]);
        ctx.beginPath(); ctx.moveTo(titleEnd, y - 3); ctx.lineTo(pgStart, y - 3); ctx.stroke(); ctx.setLineDash([]);
      }

      if (e.type === "intro") pg += 2;
      else if (e.type === "chapter") pg += 3;
      else if (e.type === "conclusion") pg += 2;

      y += e.type === "chapter" ? 38 : 34;
    }

    this.footer(ctx, bookTitle, this.pages.length);
  }

  // ── CHAPTER SPLASH — no-op, heading renders inline ───────────────────────────
  drawChapterSplash(_num: number, _title: string, _bookTitle: string) { /* no-op */ }

  // ── CONTENT PAGES ────────────────────────────────────────────────────────────
  drawContentPages(title: string, rawContent: string, bookTitle: string, isChapter = false, chNum?: number) {
    const maxY     = PAGE_H - 88;
    const lineH    = 25;
    const bodyFont = "14.5px Georgia, serif";

    let ctx: CanvasRenderingContext2D;
    let y: number;

    if (isChapter && chNum !== undefined) {
      this.trimOrphanPages();
      ctx = this.newPage(); y = 165;
    } else if (isChapter && chNum === undefined) {
      ctx = this.newPage(); y = 120;
    } else if (this._lastCtx && this._lastY < maxY - 220) {
      ctx = this._lastCtx; y = this._lastY + 40;
    } else {
      ctx = this.newPage(); y = 120;
    }

    // Chapter label badge
    if (isChapter && chNum !== undefined) {
      ctx.fillStyle = ACCENT; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`CHAPTER ${String(chNum).padStart(2, "0")}`, MX, y);
      y += 10; ctx.fillStyle = ACCENT; ctx.fillRect(MX, y, 56, 3); y += 22;
    }

    // Chapter title
    ctx.fillStyle = BLACK; ctx.font = "bold 32px sans-serif"; ctx.textAlign = "left";
    for (const l of this.wrap(ctx, title, CONTENT_W)) { ctx.fillText(l, MX, y); y += 44; }
    ctx.fillStyle = ACCENT; ctx.fillRect(MX, y - 6, 70, 4); y += 20;

    // Content blocks
    for (const block of this.parseBlocks(rawContent)) {
      if (block.type === "heading") {
        if (y > maxY - 90) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
        y += 22; ctx.fillStyle = BLACK; ctx.font = "bold 17px sans-serif"; ctx.textAlign = "left";
        for (const l of this.wrap(ctx, block.text, CONTENT_W)) { ctx.fillText(l, MX, y); y += 28; }
        ctx.fillStyle = ACCENT; ctx.fillRect(MX, y - 4, 44, 3); y += 18;

      } else if (block.type === "pullquote") {
        ctx.font = "italic 14px Georgia, serif";
        const ql = this.wrap(ctx, `"${block.text}"`, CONTENT_W - 60);
        const qh = ql.length * 26 + 44;
        if (y > maxY - qh) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
        y += 16;
        ctx.fillStyle = "#F5F3FF"; ctx.beginPath(); ctx.roundRect(MX, y, CONTENT_W, qh, 6); ctx.fill();
        ctx.fillStyle = ACCENT; ctx.fillRect(MX, y, 5, qh);
        ctx.fillStyle = "#2D1F8A"; ctx.font = "italic 14px Georgia, serif";
        let qy = y + 28;
        for (const l of ql) { ctx.fillText(l, MX + 22, qy); qy += 26; }
        y += qh + 20;

      } else if (block.type === "keyinsight") {
        ctx.font = "12.5px sans-serif";
        const kl = this.wrap(ctx, block.text, CONTENT_W - 52);
        const kh = kl.length * 22 + 48;
        if (y > maxY - kh) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
        y += 14;
        ctx.fillStyle = "#FFFBF0"; ctx.beginPath(); ctx.roundRect(MX, y, CONTENT_W, kh, 8); ctx.fill();
        ctx.fillStyle = "#D4A017"; ctx.fillRect(MX, y, 5, kh);
        ctx.fillStyle = "#8B6914"; ctx.font = "bold 10px sans-serif"; ctx.fillText("KEY INSIGHT", MX + 20, y + 18);
        ctx.fillStyle = "#5C4500"; ctx.font = "italic 12.5px Georgia, serif";
        let ky = y + 36;
        for (const l of kl) { ctx.fillText(l, MX + 20, ky); ky += 22; }
        y += kh + 20;

      } else if (block.type === "framework") {
        ctx.font = "12.5px sans-serif";
        const fl = this.wrap(ctx, block.text, CONTENT_W - 52);
        const fh = fl.length * 22 + 48;
        if (y > maxY - fh) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
        y += 14;
        ctx.fillStyle = "#F0F4FF"; ctx.beginPath(); ctx.roundRect(MX, y, CONTENT_W, fh, 8); ctx.fill();
        ctx.fillStyle = "#3B2F9E"; ctx.fillRect(MX, y, 5, fh);
        ctx.fillStyle = "#2A1F7A"; ctx.font = "bold 10px sans-serif"; ctx.fillText("FRAMEWORK", MX + 20, y + 18);
        ctx.fillStyle = "#2A1F7A"; ctx.font = "italic 12.5px Georgia, serif";
        let fy = y + 36;
        for (const l of fl) { ctx.fillText(l, MX + 20, fy); fy += 22; }
        y += fh + 20;

      } else if (block.type === "callout") {
        ctx.font = "12.5px sans-serif";
        const cl = this.wrap(ctx, block.text, CONTENT_W - 48);
        const bh = cl.length * 22 + 36;
        if (y > maxY - bh) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
        y += 12;
        ctx.fillStyle = "#F8F6FF"; ctx.beginPath(); ctx.roundRect(MX, y, CONTENT_W, bh, 8); ctx.fill();
        ctx.fillStyle = ACCENT; ctx.fillRect(MX, y, 5, bh);
        ctx.fillStyle = "#3F2F9E"; ctx.font = "italic 12.5px Georgia, serif";
        let cy = y + 22;
        for (const l of cl) { ctx.fillText(l, MX + 24, cy); cy += 22; }
        y += bh + 24;

      } else {
        ctx.fillStyle = "#1A1A1A"; ctx.font = bodyFont; ctx.textAlign = "left";
        for (const l of this.wrap(ctx, block.text, CONTENT_W)) {
          if (y > maxY) { this.footer(ctx, bookTitle, this.pages.length); ctx = this.newPage(); y = 72; }
          ctx.fillText(l, MX, y); y += lineH;
        }
        y += 16;
      }
    }

    if (y > 80) this.footer(ctx, bookTitle, this.pages.length);
    this._lastCtx = ctx; this._lastY = y;
  }

  // Remove nearly blank trailing pages
  private trimOrphanPages() {
    if (this.pages.length < 2) return;
    const last = this.pages[this.pages.length - 1];
    const ctx = last.getContext("2d")!;
    const sampleH = Math.floor(PAGE_H * 0.30);
    const data = ctx.getImageData(MX, 80, CONTENT_W, sampleH).data;
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
      // Strip leaked part labels
      .replace(/^(Text of )?(Part \d+\s*[-—]+\s*THE\s+\w+|THE INSIGHT|THE MECHANISM|THE EVIDENCE|THE COUNTER|THE EDGE)\s*$/gim, "")
      .replace(/^(The Insight|The Mechanism|The Evidence|The Counter|The Edge)\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n");

    for (const para of preprocessed.split(/\n\n+/)) {
      const t = para.trim();
      if (!t) continue;
      if (/^Chapter:\s*[""]?.{3,120}[""]?\s*$/i.test(t)) continue;
      if (/^here is the (improved|rewritten|final|humanized)/i.test(t)) continue;
      if (/^(note:|editor.?s? note:|revision:)/i.test(t)) continue;

      if (/^#{2,3}\s+/.test(t)) {
        const headingText = t.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "").split("\n")[0].trim();
        if (headingText.length > 3) {
          blocks.push({ type: "heading", text: headingText });
          const afterHeading = t.replace(/^#{2,3}\s+[^\n]+/, "").trim();
          if (afterHeading.length > 10) {
            blocks.push({ type: "body", text: afterHeading.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") });
          }
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

      if (t.startsWith(">")) {
        const raw = t.replace(/^>\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").trim();
        if (raw.startsWith('"') || raw.startsWith('\u201c')) {
          blocks.push({ type: "pullquote", text: raw.replace(/^["\u201c]+/, "").replace(/["\u201d]+$/, "").trim() });
        } else if (/^KEY INSIGHT[:\s]/i.test(raw)) {
          blocks.push({ type: "keyinsight", text: raw.replace(/^KEY INSIGHT[:\s]*/i, "").trim() });
        } else if (/^(FRAMEWORK|The .+:)/i.test(raw)) {
          blocks.push({ type: "framework", text: raw });
        } else {
          blocks.push({ type: "callout", text: raw });
        }
        continue;
      }

      const clean = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1");
      if (clean.length > 3) blocks.push({ type: "body", text: clean });
    }

    return blocks;
  }

  async exportPDF(filename: string) {
    this.trimOrphanPages();
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
      await renderer.drawCover(scriptContent.title, selectedNiche.description, topic, null);
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
