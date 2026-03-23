import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Trash2, CheckCircle2, Sparkles, AlertCircle } from "lucide-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { 
  Loader2 as LoaderIcon, 
  Copy as CopyIcon, 
  Trash2 as TrashIcon, 
  CheckCircle2 as CheckIcon, 
  Sparkles as SparklesIcon, 
  AlertCircle as AlertIcon 
} from "lucide-react";

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
  const { canUseFeature, recordUsage, getRemainingUses, isFreePlan, isExpired, hasPaidSubscription } = useFeatureAccess();

  const hasAccess = hasPaidSubscription || (isFreePlan && !isExpired);

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

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`marketing_results_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "saved_marketing_results",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newResult = {
            id: payload.new.id,
            hook: payload.new.hook,
            main_copy: payload.new.main_copy,
            cta: payload.new.cta,
            hashtags: payload.new.hashtags,
            platform: payload.new.platform,
          };
          setResults((prev) => [newResult, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const generate = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    // Check usage limits
    const allowed = await recordUsage("marketing_studio");
    if (!allowed) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing", {
        body: { platform, title: title.trim(), description: description.trim() },
      });

      if (error) throw new Error(error.message);
      
      const resultsData = data?.results;
      if (!resultsData || !Array.isArray(resultsData)) {
        throw new Error("Invalid response from AI");
      }

      const newResults: SocialResult[] = [];
      for (const r of resultsData) {
        const { data: saved, error: saveErr } = await supabase
          .from("saved_marketing_results")
          .insert({
            user_id: user!.id,
            platform: platform,
            hook: r.hook || "",
            main_copy: r.main_copy || "",
            cta: r.cta || "",
            hashtags: r.hashtags || null,
          })
          .select()
          .single();

        if (saveErr) throw new Error(`Failed to save result: ${saveErr.message}`);
        
        if (saved) {
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
      toast({ title: "Content generated!", description: `${newResults.length} posts created` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = (result: SocialResult) => {
    const text = `${result.hook}\n\n${result.main_copy}\n\n${result.cta}${result.hashtags ? `\n\n${result.hashtags}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopiedId(result.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard" });
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
      <div className="relative min-h-[calc(100vh-4rem)]">
        {isExpired && <UpgradeOverlay />}
        
        <div className={`max-w-[900px] mx-auto space-y-6 p-4 md:p-8 ${isExpired ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketing Studio</h1>
            <p className="text-muted-foreground mt-1 text-sm">Generate platform-optimized marketing content with AI.</p>
            {isFreePlan && !isExpired && remaining !== null && (
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
                {loading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
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
                            {copiedId === result.id ? <CheckIcon className="w-3.5 h-3.5 text-primary" /> : <CopyIcon className="w-3.5 h-3.5" />}
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(result.id)} className="gap-1 text-xs h-8 text-destructive hover:text-destructive">
                            <TrashIcon className="w-3.5 h-3.5" />
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
