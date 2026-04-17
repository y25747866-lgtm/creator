import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, BookOpen, FileStack, RefreshCw,
  ArrowRight, Download, Sparkles, Loader2,
  CheckCircle2, Image as ImageIcon,
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

const CATEGORY_OPTIONS = [
  "Business & Entrepreneurship","Self-Help & Personal Development",
  "Finance & Investing","Marketing & Sales","Technology & AI",
  "Health & Wellness","Education & Learning","Creativity & Design",
  "Relationships & Communication","Productivity & Habits",
];
const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "motivational", label: "Motivational" },
  { value: "educational",  label: "Educational"  },
  { value: "business",     label: "Business"     },
  { value: "conversational",label:"Conversational"},
  { value: "inspirational",label: "Inspirational" },
];
const LENGTH_OPTIONS = [
  { value:"short"  as const,label:"Short", pages:"10–30 pages",icon:<FileText  className="w-5 h-5"/>,access:"free"    as const},
  { value:"medium" as const,label:"Medium",pages:"30–40 pages",icon:<BookOpen  className="w-5 h-5"/>,access:"creator" as const},
  { value:"long"   as const,label:"Long",  pages:"40–60 pages",icon:<FileStack className="w-5 h-5"/>,access:"creator" as const},
];

type GenerationStep = "idle"|"content"|"cover"|"pdf"|"complete";
type Screen         = "form"|"generating"|"outline"|"download";

const STEP_LABELS: Record<GenerationStep,string> = {
  idle:"", content:"Writing your book... This may take a minute.",
  cover:"Designing your cover...", pdf:"Rendering your PDF...", complete:"Your ebook is ready!",
};
const STEP_PROGRESS: Record<GenerationStep,number> = {
  idle:0, content:55, cover:75, pdf:90, complete:100,
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const BLACK     = "#0A0A0A";
const WHITE     = "#FFFFFF";
const ACCENT    = "#6C63FF";
const PAGE_W    = 794;
const PAGE_H    = 1123;
const MX        = 64;
const CONTENT_W = PAGE_W - MX * 2;

// ─── ZERO-DEPENDENCY PDF BUILDER ──────────────────────────────────────────────
// Builds a real PDF binary from canvas JPEG pages — no npm install needed.

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function strBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

function buildPDF(jpegUrls: string[], pw: number, ph: number): Uint8Array {
  const n       = jpegUrls.length;
  const perPage = 3;
  const total   = 2 + n * perPage;

  const imgId     = (i: number) => 3 + i * perPage;
  const contentId = (i: number) => 3 + i * perPage + 1;
  const pageId    = (i: number) => 3 + i * perPage + 2;
  const pageIds   = Array.from({length: n}, (_, i) => pageId(i));

  const parts: Uint8Array[] = [];
  const offsets = new Array(total + 1).fill(0);
  let pos = 0;

  const push = (s: string)        => { const b = strBytes(s); parts.push(b); pos += b.length; };
  const pushB = (b: Uint8Array)   => { parts.push(b); pos += b.length; };
  const obj = (id: number, body: string) => {
    offsets[id] = pos;
    push(`${id} 0 obj\n${body}\nendobj\n\n`);
  };

  push("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n\n");

  // Catalog
  obj(1, `<<\n/Type /Catalog\n/Pages 2 0 R\n>>`);

  // Pages
  obj(2, `<<\n/Type /Pages\n/Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}]\n/Count ${n}\n>>`);

  for (let i = 0; i < n; i++) {
    const imgBytes = base64ToBytes(jpegUrls[i].split(",")[1]);

    // Image XObject
    offsets[imgId(i)] = pos;
    push(`${imgId(i)} 0 obj\n<<\n/Type /XObject\n/Subtype /Image\n/Width ${pw}\n/Height ${ph}\n/ColorSpace /DeviceRGB\n/BitsPerComponent 8\n/Filter /DCTDecode\n/Length ${imgBytes.length}\n>>\nstream\n`);
    pushB(imgBytes);
    push(`\nendstream\nendobj\n\n`);

    // Content stream
    const cs = `q\n${pw} 0 0 ${ph} 0 0 cm\n/Im${imgId(i)} Do\nQ\n`;
    obj(contentId(i), `<<\n/Length ${cs.length}\n>>\nstream\n${cs}\nendstream`);

    // Page dict
    obj(pageId(i), `<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 ${pw} ${ph}]\n/Contents ${contentId(i)} 0 R\n/Resources <<\n/XObject <<\n/Im${imgId(i)} ${imgId(i)} 0 R\n>>\n>>\n>>`);
  }

  const xref = pos;
  push(`xref\n0 ${total+1}\n`);
  push("0000000000 65535 f \n");
  for (let i = 1; i <= total; i++) push(String(offsets[i]).padStart(10,"0")+" 00000 n \n");
  push(`trailer\n<<\n/Size ${total+1}\n/Root 1 0 R\n>>\nstartxref\n${xref}\n%%EOF\n`);

  return concat(...parts);
}

async function downloadPDF(canvases: HTMLCanvasElement[], filename: string) {
  const jpegUrls = canvases.map(c => c.toDataURL("image/jpeg", 0.92));
  const bytes    = buildPDF(jpegUrls, canvases[0].width, canvases[0].height);
  const blob     = new Blob([bytes], { type: "application/pdf" });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─── PDF PAGE RENDERER ────────────────────────────────────────────────────────

class EbookPDFRenderer {
  readonly pages: HTMLCanvasElement[] = [];

  private newPage(): CanvasRenderingContext2D {
    const c = document.createElement("canvas");
    c.width = PAGE_W; c.height = PAGE_H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = WHITE; ctx.fillRect(0,0,PAGE_W,PAGE_H);
    this.pages.push(c);
    return ctx;
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(" "); const lines: string[] = []; let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line); return lines;
  }

  private footer(ctx: CanvasRenderingContext2D, title: string, n: number) {
    const y = PAGE_H - 28;
    ctx.strokeStyle="#E0E0E0"; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(MX,y-8); ctx.lineTo(PAGE_W-MX,y-8); ctx.stroke();
    ctx.fillStyle="#888"; ctx.font="bold 10px sans-serif"; ctx.textAlign="left"; ctx.fillText("NEXORAOS",MX,y+8);
    ctx.font="10px sans-serif"; ctx.textAlign="center";
    ctx.fillText(title.length>45?title.substring(0,45)+"…":title, PAGE_W/2, y+8);
    ctx.textAlign="right"; ctx.fillText(String(n),PAGE_W-MX,y+8);
  }

  async drawCover(title: string, subtitle: string, topic: string, img64: string|null, date: string) {
    const ctx = this.newPage(); const w=PAGE_W,h=PAGE_H;
    ctx.fillStyle=BLACK; ctx.fillRect(0,0,w,h);
    ctx.fillStyle=ACCENT; ctx.fillRect(0,0,w,8);
    ctx.fillStyle="#1A1A2E"; ctx.beginPath(); ctx.moveTo(w*.5,0); ctx.lineTo(w,0); ctx.lineTo(w,h*.45); ctx.closePath(); ctx.fill();

    if (img64) {
      try {
        const img = new Image();
        await new Promise<void>(res => { img.onload=()=>res(); img.onerror=()=>res(); img.src=`data:image/png;base64,${img64}`; });
        ctx.globalAlpha=0.28; ctx.drawImage(img,w*.38,0,w*.62,h*.52); ctx.globalAlpha=1;
      } catch {}
    }

    ctx.fillStyle=ACCENT; ctx.font="bold 11px sans-serif"; ctx.textAlign="left"; ctx.fillText("NEXORAOS",MX,48);
    ctx.fillStyle="#2D2D4E"; ctx.beginPath(); ctx.roundRect(MX-2,h*.37,180,24,4); ctx.fill();
    ctx.fillStyle=ACCENT; ctx.font="bold 9px sans-serif"; ctx.fillText(topic.toUpperCase().substring(0,30),MX+10,h*.37+16);

    ctx.fillStyle=WHITE; ctx.font="bold 48px sans-serif";
    let ty=h*.46;
    for (const l of this.wrap(ctx,title,CONTENT_W)) { ctx.fillText(l,MX,ty); ty+=62; }
    ctx.fillStyle=ACCENT; ctx.fillRect(MX,ty-40,80,5);
    ctx.fillStyle="#AAAAAA"; ctx.font="15px sans-serif";
    let sy=ty-12;
    for (const l of this.wrap(ctx,subtitle,CONTENT_W)) { ctx.fillText(l,MX,sy); sy+=24; }

    ctx.strokeStyle="#333355"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(MX,h*.83); ctx.lineTo(w-MX,h*.83); ctx.stroke();
    ctx.fillStyle="#666688"; ctx.font="11px sans-serif"; ctx.textAlign="left"; ctx.fillText(date,MX,h*.87);
    ctx.textAlign="right"; ctx.fillText("Generated by NexoraOS",w-MX,h*.87);
    ctx.fillStyle=ACCENT; ctx.fillRect(0,h-6,w,6);
  }

  drawTOC(toc: Array<{type:string;number?:number;label:string}>, bookTitle: string) {
    const ctx=this.newPage(); let y=72;
    ctx.fillStyle=BLACK; ctx.font="bold 30px sans-serif"; ctx.textAlign="left"; ctx.fillText("Table of Contents",MX,y); y+=14;
    ctx.fillStyle=ACCENT; ctx.fillRect(MX,y,70,4); y+=28;
    for (const e of toc) {
      if (y>PAGE_H-100) break;
      if (e.type==="chapter") { ctx.fillStyle=ACCENT; ctx.font="bold 9px sans-serif"; ctx.fillText(`CHAPTER ${String(e.number).padStart(2,"0")}`,MX,y); y+=18; }
      ctx.fillStyle=BLACK; ctx.font=e.type==="chapter"?"bold 14px sans-serif":"15px sans-serif"; ctx.fillText(e.label,MX,y); y+=6;
      ctx.strokeStyle="#E0E0E0"; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(MX,y+8); ctx.lineTo(PAGE_W-MX,y+8); ctx.stroke(); y+=28;
    }
    this.footer(ctx,bookTitle,this.pages.length);
  }

  drawChapterSplash(num: number, title: string, bookTitle: string) {
    const ctx=this.newPage(); const w=PAGE_W,h=PAGE_H;
    ctx.fillStyle=BLACK; ctx.fillRect(0,0,w,h);
    ctx.fillStyle=WHITE; ctx.fillRect(0,h*.52,w,h*.48);
    ctx.fillStyle=ACCENT; ctx.fillRect(0,h*.52,w,6);
    ctx.fillStyle="#1A1A1A"; ctx.font="bold 200px sans-serif"; ctx.textAlign="left"; ctx.fillText(String(num).padStart(2,"0"),MX-8,h*.57);
    ctx.fillStyle=ACCENT; ctx.font="bold 10px sans-serif"; ctx.fillText("CHAPTER",MX,h*.26);
    ctx.fillStyle=WHITE; ctx.font="bold 44px sans-serif"; ctx.fillText(String(num).padStart(2,"0"),MX,h*.34);
    ctx.font="bold 24px sans-serif"; let ty=h*.41;
    for (const l of this.wrap(ctx,title,CONTENT_W)) { ctx.fillText(l,MX,ty); ty+=34; }
    ctx.fillStyle="#555"; ctx.font="10px sans-serif"; ctx.textAlign="right"; ctx.fillText("NEXORAOS",w-MX,h-24);
    this.footer(ctx,bookTitle,this.pages.length);
  }

  drawContentPages(title: string, content: string, bookTitle: string, isChapter=false, chNum?: number) {
    const maxY=PAGE_H-80; let ctx=this.newPage(); let y=72;
    if (isChapter && chNum!==undefined) {
      ctx.fillStyle=ACCENT; ctx.font="bold 9px sans-serif"; ctx.textAlign="left"; ctx.fillText(`CHAPTER ${String(chNum).padStart(2,"0")}`,MX,y); y+=22;
    }
    ctx.fillStyle=BLACK; ctx.font="bold 26px sans-serif"; ctx.textAlign="left";
    for (const l of this.wrap(ctx,title,CONTENT_W)) { ctx.fillText(l,MX,y); y+=34; }
    ctx.fillStyle=ACCENT; ctx.fillRect(MX,y,60,4); y+=20;

    for (const block of this.parseBlocks(content)) {
      if (block.type==="heading") {
        if (y>maxY-60) { this.footer(ctx,bookTitle,this.pages.length); ctx=this.newPage(); y=72; }
        y+=12; ctx.fillStyle=BLACK; ctx.font="bold 15px sans-serif"; ctx.textAlign="left";
        for (const l of this.wrap(ctx,block.text,CONTENT_W)) { ctx.fillText(l,MX,y); y+=22; } y+=4;

      } else if (block.type==="callout") {
        ctx.font="11px sans-serif";
        const cl=this.wrap(ctx,block.text,CONTENT_W-40); const bh=cl.length*20+28;
        if (y>maxY-bh) { this.footer(ctx,bookTitle,this.pages.length); ctx=this.newPage(); y=72; }
        y+=8;
        ctx.fillStyle="#F0EEFF"; ctx.beginPath(); ctx.roundRect(MX,y,CONTENT_W,bh,6); ctx.fill();
        ctx.fillStyle=ACCENT; ctx.fillRect(MX,y,5,bh);
        ctx.fillStyle="#4A42CC"; ctx.font="bold italic 11px sans-serif"; let cy=y+18;
        for (const l of cl) { ctx.fillText(l,MX+20,cy); cy+=20; } y+=bh+14;

      } else {
        ctx.fillStyle="#222"; ctx.font="13px sans-serif"; ctx.textAlign="left";
        for (const l of this.wrap(ctx,block.text,CONTENT_W)) {
          if (y>maxY) { this.footer(ctx,bookTitle,this.pages.length); ctx=this.newPage(); y=72; }
          ctx.fillText(l,MX,y); y+=21;
        } y+=10;
      }
    }
    this.footer(ctx,bookTitle,this.pages.length);
  }

  drawBackCover() {
    const ctx=this.newPage(); const w=PAGE_W,h=PAGE_H;
    ctx.fillStyle=BLACK; ctx.fillRect(0,0,w,h);
    ctx.fillStyle=ACCENT; ctx.fillRect(0,h*.5,w,6);
    ctx.fillStyle=ACCENT; ctx.font="bold 38px sans-serif"; ctx.textAlign="center"; ctx.fillText("NexoraOS",w/2,h*.42);
    ctx.fillStyle=WHITE; ctx.font="15px sans-serif"; ctx.fillText("AI-Powered Business Operating System",w/2,h*.47);
    ctx.fillStyle="#666688"; ctx.font="12px sans-serif"; ctx.fillText("www.nexoraos.online",w/2,h*.53);
    ctx.fillStyle=WHITE; ctx.font="italic 22px Georgia,serif"; ctx.fillText('"Begin now."',w/2,h*.65);
    ctx.fillStyle=ACCENT; ctx.fillRect(0,h-6,w,6);
  }

  private parseBlocks(content: string): Array<{type:string;text:string}> {
    return content.split(/\n\n+/).map(p => p.trim()).filter(Boolean).map(t => {
      if (t.startsWith("## ")||t.startsWith("### ")) return {type:"heading",text:t.replace(/^#{2,3}\s+/,"")};
      if (t.startsWith("**")&&t.endsWith("**")&&t.length<120) return {type:"heading",text:t.replace(/\*\*/g,"")};
      if (t.startsWith(">")) return {type:"callout",text:t.replace(/^>\s*/,"")};
      return {type:"body",text:t.replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/`(.*?)`/g,"$1")};
    });
  }

  async exportPDF(filename: string) {
    await downloadPDF(this.pages, filename);
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const EbookGenerator = () => {
  const [screen,         setScreen]         = useState<Screen>("form");
  const [topic,          setTopic]          = useState("");
  const [description,    setDescription]    = useState("");
  const [category,       setCategory]       = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone,           setTone]           = useState("professional");
  const [ebookLength,    setEbookLength]    = useState<"short"|"medium"|"long">("short");
  const [step,           setStep]           = useState<GenerationStep>("idle");
  const [errorMsg,       setErrorMsg]       = useState<string|null>(null);
  const [ebookData,      setEbookData]      = useState<Ebook|null>(null);
  const [chapters,       setChapters]       = useState<{id:number;title:string;description:string;phase:string;modules:string;}[]>([]);

  const { toast }       = useToast();
  const addEbook        = useEbookStore(s => s.addEbook);
  const navigate        = useNavigate();
  const { recordUsage } = useFeatureAccess();
  const { subscription, planType } = useSubscription();
  const { user }        = useAuth();

  const isExpired        = subscription?.status === "expired";
  const isCreatorOrAbove = (planType==="creator"||planType==="pro") && !isExpired;
  const canSelectLength  = (a:"free"|"creator"|"pro") => a==="free"?true:a==="creator"?isCreatorOrAbove:planType==="pro"&&!isExpired;

  const startGeneration = async () => {
    if (!topic.trim()||!category) { toast({title:"Required Fields",description:"Please enter a topic and select a category.",variant:"destructive"}); return; }
    if (!canSelectLength("creator")&&ebookLength!=="short") { toast({title:"Upgrade Required",description:"Free plan only allows short ebooks.",variant:"destructive"}); setEbookLength("short"); return; }
    const allowed = await recordUsage("ebook_generator");
    if (!allowed) return;

    setScreen("generating"); setStep("content"); setErrorMsg(null); setEbookData(null);

    try {
      const { data:{session} } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please log in to generate ebooks.");

      // STEP 1 — Generate text
      const { data:genData, error:genError } = await supabase.functions.invoke("generate-ebook", {
        body: { topic, description, length:ebookLength, category, targetAudience, tone },
      });
      if (genError) throw new Error(genError.message);
      if (!genData?.success) throw new Error(genData?.error||"Content generation failed");

      // STEP 2 — Cover image
      setStep("cover");
      let coverBase64: string|null = null;
      try {
        const { data:coverData } = await supabase.functions.invoke("cover-image", { body:{topic,title:genData.meta.title} });
        if (coverData?.imageBase64) coverBase64 = coverData.imageBase64;
      } catch {}

      // STEP 3 — Render PDF in browser (zero dependencies)
      setStep("pdf");
      const renderer = new EbookPDFRenderer();
      const date = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long"});

      await renderer.drawCover(genData.meta.title, genData.cover.subtitle, topic, coverBase64, date);
      renderer.drawTOC(genData.toc, genData.meta.title);
      renderer.drawContentPages("Introduction", genData.content.introduction, genData.meta.title);
      for (const ch of genData.content.chapters) {
        renderer.drawChapterSplash(ch.number, ch.title, genData.meta.title);
        renderer.drawContentPages(ch.title, ch.content, genData.meta.title, true, ch.number);
      }
      renderer.drawContentPages("Conclusion", genData.content.conclusion, genData.meta.title);
      renderer.drawBackCover();

      const safeTitle = genData.meta.title.replace(/[^a-z0-9]/gi,"_").toLowerCase();
      const filename  = `${safeTitle}_nexoraos.pdf`;

      // STEP 4 — Build Ebook object
      const flatContent = [
        `# ${genData.meta.title}`,
        `## Introduction\n\n${genData.content.introduction}`,
        ...genData.content.chapters.map((c:any)=>`## ${c.title}\n\n${c.content}`),
        `## Conclusion\n\n${genData.content.conclusion}`,
      ].join("\n\n");

      const ebook: Ebook = {
        id: crypto.randomUUID(), title:genData.meta.title,
        topic, description,
        content: flatContent,
        coverImageUrl: coverBase64?`data:image/png;base64,${coverBase64}`:null,
        pages: genData.meta.estimatedPages, length:ebookLength,
        createdAt: new Date().toISOString(), userId:user?.id,
        _renderer: renderer, _filename: filename,
      };

      setChapters(
        genData.toc.filter((e:any)=>e.type==="chapter").map((e:any)=>({
          id:e.number, title:e.label,
          description:`Chapter ${e.number} of your ebook`,
          phase:`Phase ${Math.ceil(e.number/3)}`,
          modules:`${(e.number%4)+2} Sections`,
        }))
      );

      addEbook(ebook); setEbookData(ebook); setStep("complete"); setScreen("outline");

      try {
        const {product} = await createTrackedProduct({title:ebook.title,topic:ebook.topic,description:ebook.description||"",length:ebook.length||"medium",content:ebook.content,coverImageUrl:ebook.coverImageUrl,pages:ebook.pages});
        ebook.dbProductId = product?.id;
        if (product?.id) { try { await recordMetric(product.id,"view"); } catch {} }
      } catch (e) { console.warn("Tracking failed:",e); }

      toast({ title:"Success!", description:`"${ebook.title}" is ready.` });

    } catch (e
