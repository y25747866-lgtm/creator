import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

interface SocialResult {
  id: string;
  hook: string;
  main_copy: string;
  cta: string;
  hashtags?: string;
}

const MarketingStudio = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "x">("instagram");
  const [results, setResults] = useState<SocialResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing", {
        body: { platform, title: title.trim(), description: description.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.results || !Array.isArray(data.results)) {
        throw new Error("Invalid response from AI");
      }

      const newResults: SocialResult[] = data.results.map((r: any, i: number) => ({
        id: `${Date.now()}-${i}`,
        hook: r.hook || "",
        main_copy: r.main_copy || "",
        cta: r.cta || "",
        hashtags: r.hashtags || "",
      }));

      setResults((prev) => [...newResults, ...prev]);
      toast({ title: "Content generated!" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async (result: SocialResult) => {
    const text = `${result.hook}\n\n${result.main_copy}\n\n${result.cta}${result.hashtags ? `\n\n${result.hashtags}` : ""}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(result.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const deleteResult = (id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Marketing Studio</h1>
          <p className="text-muted-foreground mt-2 text-base">Generate platform-optimized marketing content with AI.</p>
        </div>

        <Card className="bg-card shadow-sm border border-border/60 rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Title</label>
            <Input
              placeholder="e.g. Launch of my SaaS tool"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="h-12 text-base rounded-xl border-border/60 focus-visible:ring-primary/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Description</label>
            <Textarea
              placeholder="What is your product/offer about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              className="text-base rounded-xl border-border/60 focus-visible:ring-primary/40 min-h-[120px]"
            />
          </div>
          <div className="flex gap-4 items-end flex-wrap pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Platform</label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as "instagram" | "x")} disabled={loading}>
                <SelectTrigger className="w-48 h-12 rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading} className="gap-2 h-12 px-6 rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Posts
            </Button>
          </div>
        </Card>

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {results.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  layout
                >
                  <Card className="bg-card shadow-sm border border-border/60 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{platform === "instagram" ? "Instagram" : "X (Twitter)"}</Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => copyResult(result)} className="gap-1">
                          {copiedId === result.id ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteResult(result.id)} className="gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 divide-y divide-border/40">
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Hook</p>
                        <p className="font-medium">{result.hook}</p>
                      </div>
                      <div className="pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Main Copy</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.main_copy}</p>
                      </div>
                      <div className="pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">CTA</p>
                        <p className="text-sm font-medium text-primary">{result.cta}</p>
                      </div>
                      {result.hashtags && (
                        <div className="pt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Hashtags</p>
                          <p className="text-sm text-muted-foreground">{result.hashtags}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default MarketingStudio;
