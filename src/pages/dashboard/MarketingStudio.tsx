import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Trash2, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface SocialResult {
  id: string;
  hook: string;
  main_copy: string;
  cta: string;
  hashtags?: string;
  platform: string;
}

const MarketingStudio = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "x">("instagram");
  const [results, setResults] = useState<SocialResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { canUseFeature, recordUsage, getRemainingUses, isFreePlan } = useFeatureAccess();

  // Load saved results from DB
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingSaved(true);
      const { data } = await supabase
        .from("saved_marketing_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setResults(data.map((r: any) => ({
          id: r.id,
          hook: r.hook,
          main_copy: r.main_copy,
          cta: r.cta,
          hashtags: r.hashtags,
          platform: r.platform,
        })));
      }
      setLoadingSaved(false);
    };
    load();
  }, [user]);

  const generate = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    // Check usage limits for free plan
    const allowed = await recordUsage("marketing_studio");
    if (!allowed) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing", {
        body: { platform, title: title.trim(), description: description.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.results || !Array.isArray(data.results)) throw new Error("Invalid response from AI");

      const newResults: SocialResult[] = [];
      for (const r of data.results) {
        const { data: saved, error: saveErr } = await supabase
          .from("saved_marketing_results")
          .insert({
            user_id: user!.id,
            platform,
            hook: r.hook || "",
            main_copy: r.main_copy || "",
            cta: r.cta || "",
            hashtags: r.hashtags || null,
          })
          .select()
          .single();

        if (saved && !saveErr) {
          newResults.push({
            id: saved.id,
            hook: saved.hook,
            main_copy: saved.main_copy,
            cta: saved.cta,
            hashtags: saved.hashtags,
            platform: saved.platform,
          });
        }
      }

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

  const handleSelectText = (e: React.MouseEvent<HTMLDivElement>) => {
    const range = document.createRange();
    range.selectNodeContents(e.currentTarget);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const deleteResult = async (id: string) => {
    await supabase.from("saved_marketing_results").delete().eq("id", id);
    setResults((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
    toast({ title: "Deleted" });
  };

  const remaining = getRemainingUses("marketing_studio");

  return (
    <DashboardLayout>
      <div className="max-w-[900px] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Studio</h1>
          <p className="text-muted-foreground mt-1 text-sm">Generate platform-optimized marketing content with AI.</p>
          {isFreePlan && remaining !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              {remaining > 0 ? `${remaining} generation${remaining === 1 ? "" : "s"} remaining today` : "Daily limit reached — upgrade to continue"}
            </p>
          )}
        </div>

        <Card className="rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input placeholder="e.g. Launch of my SaaS tool" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} className="h-10 text-sm rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea placeholder="What is your product/offer about?" value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} rows={4} className="text-sm rounded-lg min-h-[100px]" />
          </div>
          <div className="flex gap-3 items-end flex-wrap pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as "instagram" | "x")} disabled={loading}>
                <SelectTrigger className="w-44 h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading || (isFreePlan && remaining === 0)} className="gap-2 h-10 px-5 rounded-lg text-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Posts
            </Button>
          </div>
        </Card>

        {/* Saved Results */}
        {results.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Saved Results</h2>
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {results.map((result) => (
                <motion.div key={result.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} layout>
                  <Card className="rounded-2xl border border-border shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{result.platform === "instagram" ? "Instagram" : "X (Twitter)"}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyResult(result)} className="gap-1 text-xs h-8">
                          {copiedId === result.id ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(result.id)} className="gap-1 text-xs h-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 divide-y divide-border/50 cursor-text" onClick={handleSelectText}>
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this result?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteResult(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MarketingStudio;
