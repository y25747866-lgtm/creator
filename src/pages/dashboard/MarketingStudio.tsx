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
      <div className="max-w-[900px] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Studio</h1>
          <p className="text-muted-foreground mt-1 text-sm">Generate platform-optimized marketing content with AI.</p>
        </div>

        <Card className="rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input
              placeholder="e.g. Launch of my SaaS tool"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="h-10 text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea
              placeholder="What is your product/offer about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              className="text-sm rounded-lg min-h-[100px]"
            />
          </div>
          <div className="flex gap-3 items-end flex-wrap pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as "instagram" | "x")} disabled={loading}>
                <SelectTrigger className="w-44 h-10 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading} className="gap-2 h-10 px-5 rounded-lg text-sm">
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
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  layout
                >
                  <Card className="rounded-2xl border border-border shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{platform === "instagram" ? "Instagram" : "X (Twitter)"}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyResult(result)} className="gap-1 text-xs h-8">
                          {copiedId === result.id ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteResult(result.id)} className="gap-1 text-xs h-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 divide-y divide-border/50">
                      <div className="pt-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                        <p className="font-medium text-sm">{result.hook}</p>
                      </div>
                      <div className="pt-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Main Copy</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.main_copy}</p>
                      </div>
                      <div className="pt-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">CTA</p>
                        <p className="text-sm font-medium text-primary">{result.cta}</p>
                      </div>
                      {result.hashtags && (
                        <div className="pt-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hashtags</p>
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
