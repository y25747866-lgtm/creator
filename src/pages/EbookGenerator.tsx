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

    } catch (err:any) {
      setErrorMsg(err.message); setStep("idle"); setScreen("form");
      toast({ title:"Generation Failed", description:err.message, variant:"destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!isCreatorOrAbove) { toast({title:"Upgrade Required",description:"Downloads require Creator or Pro plan.",variant:"destructive"}); return; }
    if (!ebookData) return;
    try {
      await (ebookData as any)._renderer?.exportPDF((ebookData as any)._filename||"ebook_nexoraos.pdf");
      if (ebookData.dbProductId) { try { await recordMetric(ebookData.dbProductId,"download"); } catch {} }
    } catch (err:any) { toast({title:"Download Failed",description:err.message,variant:"destructive"}); }
  };

  const handleDownloadCover = () => {
    if (!isCreatorOrAbove) { toast({title:"Upgrade Required",description:"Downloads require Creator or Pro plan.",variant:"destructive"}); return; }
    if (!ebookData?.coverImageUrl) return;
    const a = document.createElement("a"); a.href=ebookData.coverImageUrl;
    a.download=`cover_${ebookData.title.replace(/[^a-z0-9]/gi,"_").toLowerCase()}.png`;
    a.click();
  };

  const resetForm = () => {
    setScreen("form");setStep("idle");setEbookData(null);setChapters([]);
    setTopic("");setDescription("");setCategory("");setTargetAudience("");
    setTone("professional");setEbookLength("short");setErrorMsg(null);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  const lbl = { fontFamily:"DM Sans",fontSize:"10px",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase" as const,color:"#555555",display:"block" };
  const inp = { background:"#161616",border:"1px solid #1A1A1A",borderRadius:"6px",color:"#FFFFFF",fontFamily:"DM Sans",fontSize:"14px",padding:"12px 14px",width:"100%",outline:"none",boxSizing:"border-box" as const };

  const renderForm = () => (
    <motion.div key="form" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="max-w-[580px]">
      <div className="mb-10">
        <span style={{display:"inline-block",background:"#111111",border:"1px solid #1A1A1A",color:"rgba(255,255,255,0.5)",fontSize:"10px",fontWeight:600,letterSpacing:"0.12em",padding:"4px 10px",borderRadius:"4px",textTransform:"uppercase",fontFamily:"DM Sans",marginBottom:"12px"}}>AI PRODUCT GENERATOR</span>
        <h1 style={{fontFamily:"Syne",fontSize:"32px",fontWeight:800,color:"#FFFFFF",marginBottom:"8px"}}>Create Professional Ebooks</h1>
        <p style={{fontFamily:"DM Sans",fontSize:"14px",color:"#666666",marginBottom:"32px"}}>Enter your topic and let AI write a complete ebook ready to download as PDF in minutes.</p>
      </div>

      <div style={{background:"#111111",border:"1px solid #2A2A2A",borderRadius:"10px",padding:"32px",marginBottom:"16px"}}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label style={lbl}>Ebook Topic</label>
            <input type="text" placeholder="e.g. Passive income strategies for 2025" value={topic} onChange={e=>setTopic(e.target.value)} style={inp}/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label style={lbl}>Category</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp,appearance:"none" as any,color:category?"#FFFFFF":"#333333"}}>
                <option value="" style={{background:"#161616",color:"#333"}}>Select Category</option>
                {CATEGORY_OPTIONS.map(o=><option key={o} value={o} style={{background:"#161616"}}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label style={lbl}>Tone</label>
              <select value={tone} onChange={e=>setTone(e.target.value)} style={{...inp,appearance:"none" as any}}>
                {TONE_OPTIONS.map(o=><option key={o.value} value={o.value} style={{background:"#161616"}}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label style={lbl}>Target Audience <span style={{color:"#333",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
            <input type="text" placeholder="e.g. Beginners, Freelancers, Small business owners" value={targetAudience} onChange={e=>setTargetAudience(e.target.value)} style={inp}/>
          </div>

          <div className="space-y-3">
            <label style={lbl}>Ebook Length</label>
            <div className="grid grid-cols-3 gap-3">
              {LENGTH_OPTIONS.map(opt=>{
                const locked=!canSelectLength(opt.access); const active=ebookLength===opt.value&&!locked;
                return (
                  <button key={opt.value} onClick={()=>{if(locked){toast({title:"Upgrade Required",description:`${opt.label} ebooks require Creator or Pro plan.`,variant:"destructive"});return;}setEbookLength(opt.value);}}
                    style={{background:active?"#FFFFFF":"#161616",border:`1px solid ${active?"#FFFFFF":"#2A2A2A"}`,borderRadius:"8px",color:active?"#0A0A0A":locked?"#333333":"#FFFFFF",cursor:locked?"not-allowed":"pointer",padding:"16px 8px",textAlign:"center",opacity:locked?.5:1,transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
                    <span style={{opacity:.7}}>{opt.icon}</span>
                    <span style={{fontFamily:"Syne",fontSize:"13px",fontWeight:700}}>{opt.label}</span>
                    <span style={{fontFamily:"DM Sans",fontSize:"10px",opacity:.6}}>{opt.pages}</span>
                    {locked&&<span style={{fontSize:"9px",color:"#555"}}>Creator+</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label style={lbl}>Additional Context <span style={{color:"#333",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
            <textarea placeholder="Add specific points you want the AI to cover..." value={description} onChange={e=>setDescription(e.target.value)} rows={3}
              style={{...inp,resize:"vertical" as any}}/>
          </div>

          {errorMsg&&<div style={{background:"#1A0D0D",border:"1px solid #4D1A1A",borderRadius:"6px",padding:"12px 14px"}}><p style={{fontFamily:"DM Sans",fontSize:"13px",color:"#F44336",margin:0}}>{errorMsg}</p></div>}

          <Button onClick={startGeneration} disabled={!topic.trim()||!category}
            style={{background:"#FFFFFF",color:"#0A0A0A",fontFamily:"Syne",fontWeight:700,fontSize:"14px",borderRadius:"6px",height:"48px",width:"100%"}}>
            <Sparkles className="w-4 h-4 mr-2"/>Generate Ebook<ArrowRight className="w-4 h-4 ml-2"/>
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderGenerating = () => (
    <motion.div key="generating" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="max-w-[580px] text-left py-16">
      <div style={{width:"80px",height:"80px",borderRadius:"16px",background:"#111111",border:"1px solid #2A2A2A",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"24px"}}>
        <Loader2 className="w-10 h-10 text-white animate-spin"/>
      </div>
      <h2 style={{fontFamily:"Syne",fontSize:"28px",fontWeight:800,color:"#FFFFFF",marginBottom:"8px"}}>{STEP_LABELS[step]}</h2>
      <p style={{fontFamily:"DM Sans",fontSize:"14px",color:"#666666",marginBottom:"32px"}}>This typically takes 60–120 seconds. Please keep this tab open.</p>
      <div className="max-w-sm">
        <Progress value={STEP_PROGRESS[step]} className="h-1 bg-[#1A1A1A]" style={{borderRadius:"2px"}}/>
        <p style={{fontFamily:"DM Sans",fontSize:"11px",color:"#555555",textAlign:"right",marginTop:"8px",fontWeight:600}}>{STEP_PROGRESS[step]}% COMPLETE</p>
      </div>
    </motion.div>
  );

  const renderOutline = () => (
    <motion.div key="outline" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="max-w-[580px]">
      <div className="mb-8">
        <span style={{display:"inline-block",background:"#111111",border:"1px solid #1A1A1A",color:"rgba(255,255,255,0.5)",fontSize:"10px",fontWeight:600,letterSpacing:"0.12em",padding:"4px 10px",borderRadius:"4px",textTransform:"uppercase",fontFamily:"DM Sans",marginBottom:"12px"}}>EBOOK OUTLINE</span>
        <h2 style={{fontFamily:"Syne",fontSize:"32px",fontWeight:800,color:"#FFFFFF",marginBottom:"8px"}}>Your Ebook Structure</h2>
        <p style={{fontFamily:"DM Sans",fontSize:"14px",color:"#666666",marginBottom:"32px"}}>Review your chapters before downloading</p>
      </div>
      <div className="space-y-3 mb-8">
        {chapters.map(ch=>(
          <div key={ch.id} style={{background:"#111111",border:"1px solid #2A2A2A",borderRadius:"10px",padding:"20px"}}>
            <h3 style={{fontFamily:"Syne",fontSize:"14px",fontWeight:700,color:"#FFFFFF",marginBottom:"6px"}}>{ch.title}</h3>
            <p style={{fontFamily:"DM Sans",fontSize:"12px",color:"#666666",marginBottom:"12px"}}>{ch.description}</p>
            <div className="flex gap-2">
              <span style={{background:"#161616",border:"1px solid #1A1A1A",color:"#555555",fontSize:"10px",fontWeight:600,padding:"2px 8px",borderRadius:"4px",textTransform:"uppercase",fontFamily:"DM Sans"}}>{ch.phase}</span>
              <span style={{background:"#161616",border:"1px solid #1A1A1A",color:"#555555",fontSize:"10px",fontWeight:600,padding:"2px 8px",borderRadius:"4px",textTransform:"uppercase",fontFamily:"DM Sans"}}>{ch.modules}</span>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={()=>setScreen("download")} style={{background:"#FFFFFF",color:"#0A0A0A",fontFamily:"Syne",fontWeight:700,fontSize:"14px",borderRadius:"6px",height:"48px",width:"100%"}}>
        Continue<ArrowRight className="w-4 h-4 ml-2"/>
      </Button>
    </motion.div>
  );

  const renderDownload = () => (
    <motion.div key="download" initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}} className="max-w-[580px] text-left">
      <div className="mb-8">
        <div style={{width:"192px",height:"256px",background:"#111111",border:"1px solid #2A2A2A",borderRadius:"10px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",overflow:"hidden",position:"relative"}}>
          {ebookData?.coverImageUrl&&<img src={ebookData.coverImageUrl} alt="Cover" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.4,borderRadius:"10px"}}/>}
          <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
            <h3 style={{fontFamily:"Syne",fontWeight:800,fontSize:"13px",color:"#FFFFFF",marginBottom:"8px",lineHeight:1.3}}>{ebookData?.title}</h3>
            <p style={{fontFamily:"DM Sans",fontSize:"10px",color:"#666666"}}>A Complete Guide</p>
            <p style={{fontFamily:"DM Sans",fontSize:"10px",color:"#333333",marginTop:"12px"}}>NexoraOS</p>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-white"/>
          <h2 style={{fontFamily:"Syne",fontSize:"24px",fontWeight:800,color:"#FFFFFF"}}>Your Ebook is Ready</h2>
        </div>
        <p style={{fontFamily:"DM Sans",fontSize:"16px",fontWeight:600,color:"#FFFFFF"}}>{ebookData?.title}</p>
        <p style={{fontFamily:"DM Sans",fontSize:"13px",color:"#666666",marginTop:"4px"}}>{ebookData?.pages} pages · PDF format</p>
      </div>
      <div className="space-y-3">
        <Button onClick={handleDownloadPDF} disabled={!isCreatorOrAbove} style={{background:"#FFFFFF",color:"#0A0A0A",fontFamily:"Syne",fontWeight:700,fontSize:"14px",borderRadius:"6px",height:"48px",width:"100%"}}>
          <Download className="w-4 h-4 mr-2"/>{isCreatorOrAbove?"Download PDF":"Upgrade to Download"}
        </Button>
        {ebookData?.coverImageUrl&&(
          <Button onClick={handleDownloadCover} variant="outline" disabled={!isCreatorOrAbove} style={{background:"transparent",border:"1px solid #2A2A2A",color:"#FFFFFF",fontFamily:"Syne",fontWeight:700,fontSize:"14px",borderRadius:"6px",height:"48px",width:"100%"}}>
            <ImageIcon className="w-4 h-4 mr-2"/>Download Cover
          </Button>
        )}
        {!isCreatorOrAbove&&<p style={{fontFamily:"DM Sans",fontSize:"12px",color:"#666666",textAlign:"center"}}>Upgrade to Creator or Pro to download.</p>}
        <Button variant="ghost" onClick={resetForm} style={{color:"#666666",fontFamily:"DM Sans",fontSize:"14px",width:"100%"}}>
          <RefreshCw className="w-4 h-4 mr-2"/>Generate Another
        </Button>
      </div>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <AnimatePresence mode="wait">
          {screen==="form"       && renderForm()}
          {screen==="generating" && renderGenerating()}
          {screen==="outline"    && renderOutline()}
          {screen==="download"   && renderDownload()}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
