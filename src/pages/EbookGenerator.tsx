import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, Download, Image } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from 'jspdf';

const EbookGenerator = () => {
  const [topic, setTopic] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [ebookLength, setEbookLength] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [generatedEbook, setGeneratedEbook] = useState<Ebook | null>(null);
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);

  useEffect(() => {
    if (topic.length > 3) {
      const timeout = setTimeout(() => {
        generateTitle(topic);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setGeneratedTitle("");
    }
  }, [topic]);

  const generateTitle = async (topicText: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-ebook-title", {
        body: { topic: topicText },
      });

      if (error) throw error;
      if (data?.title) {
        setGeneratedTitle(data.title);
      }
    } catch (error) {
      console.error("Error generating title:", error);
    }
  };

  const generateEbook = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your ebook.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatus("Starting AI...");
    setGeneratedEbook(null);

    try {
      setProgress(30);
      setStatus("Generating unique title...");

      setProgress(50);
      setStatus("Writing full ebook...");

      const { data: contentData, error: contentError } = await supabase.functions.invoke(
        "generate-ebook-content",
        { body: { topic, title: generatedTitle || topic, length: ebookLength } }
      );

      if (contentError) throw contentError;

      setProgress(70);
      setStatus("Designing beautiful cover...");

      const { data: coverData, error: coverError } = await supabase.functions.invoke(
        "generate-ebook-cover",
        { body: { title: generatedTitle || topic, topic } }
      );

      if (coverError) throw coverError;

      setProgress(100);
      setStatus("Your real ebook is ready!");

      const ebook: Ebook = {
        id: crypto.randomUUID(),
        title: generatedTitle || topic,
        topic,
        content: contentData.content,
        coverImageUrl: coverData.imageUrl,
        pages: contentData.pages,
        createdAt: new Date().toISOString(),
      };

      addEbook(ebook);
      setGeneratedEbook(ebook);

      toast({
        title: "Success!",
        description: "Full readable ebook ready. Click to download!",
      });
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Failed",
        description: "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = (ebook: Ebook) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Page 1: Cover (text fallback since jsPDF can't add SVG directly)
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFontSize(40);
    doc.setTextColor(251, 191, 36);
    doc.text(ebook.title, pageWidth / 2, pageHeight / 2 - 50, { align: 'center' });
    doc.setFontSize(20);
    doc.text(ebook.topic, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text("NexoraOS by Yesh Malik", pageWidth / 2, pageHeight - 50, { align: 'center' });

    // Content from page 2
    doc.addPage();
    let y = 20;
    const lines = ebook.content.split('\n');
    for (let line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      if (line.startsWith('# ')) {
        doc.setFontSize(24);
        doc.text(line.slice(2), 20, y);
        y += 30;
      } else if (line.startsWith('## ')) {
        doc.setFontSize(18);
        doc.text(line.slice(3), 20, y);
        y += 25;
      } else if (line) {
        doc.setFontSize(12);
        const split = doc.splitTextToSize(line, pageWidth - 40);
        doc.text(split, 20, y);
        y += split.length * 8;
      } else {
        y += 10;
      }
    }

    doc.save(`${ebook.title}.pdf`);
  };

  const downloadCoverImage = (ebook: Ebook) => {
    if (!ebook.coverImageUrl) return;
    const a = document.createElement('a');
    a.href = ebook.coverImageUrl;
    a.download = `${ebook.title}_cover.svg`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">AI Ebook Generator</h1>
          <p className="text-muted-foreground">Create a real, full ebook.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGenerating} placeholder="Money making" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Length</label>
                <select value={ebookLength} onChange={(e) => setEbookLength(e.target.value)} className="w-full p-2 rounded border">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long (40-50 pages)</option>
                </select>
              </div>

              {generatedTitle && (
                <div className="p-4 rounded bg-purple-50">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Title</span>
                  </div>
                  <p className="font-bold text-lg">{generatedTitle}</p>
                </div>
              )}

              {isGenerating && (
                <div className="space-y-3">
                  <Progress value={progress} />
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{status}</span>
                  </div>
                </div>
              )}

              <Button onClick={generateEbook} disabled={isGenerating || !topic.trim()} className="w-full">
                {isGenerating ? "Generating..." : "Generate Ebook"}
              </Button>
            </div>
          </Card>
        </motion.div>

        {generatedEbook && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8">
              <h2 className="text-xl font-semibold mb-6">Your Ebook is Ready!</h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-48">
                  <img src={generatedEbook.coverImageUrl} alt="Cover" className="w-full rounded-lg shadow-lg" />
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="text-2xl font-bold">{generatedEbook.title}</h3>
                  <p>Topic: {generatedEbook.topic}</p>
                  <p>Pages: ~{generatedEbook.pages}</p>

                  <div className="flex gap-4">
                    <Button onClick={() => generatePDF(generatedEbook)}>
                      Download PDF
                    </Button>
                    <Button variant="outline" onClick={() => downloadCoverImage(generatedEbook)}>
                      Download Cover
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EbookGenerator;
