import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2 as LoaderIcon, 
  Copy as CopyIcon, 
  Trash2 as TrashIcon, 
  CheckCircle2 as CheckIcon, 
  Sparkles as SparklesIcon, 
} from "lucide-react";
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
import { useSubscription } from "@/hooks/useSubscription";
import { useEbookStore } from "@/hooks/useEbookStore";

interface SocialResult {
  id: string;
  hook: string;
  main_copy: string;
  cta: string;
  hashtags?: string;
  platform: string;
}

const MarketingStudio = () => {
  const { user } = useAuth();
  const { getEbooksForUser } = useEbookStore();
  const userEbooks = user ? getEbooksForUser(user.id) : [];
  const [selectedEbook, setSelectedEbook] = useState<string>("custom");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "x">("instagram");
  const [results, setResults] = useState<SocialResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const { toast } = useToast();
  const { recordUsage, getRemainingUses, isFreePlan, canUseFeature } = useFeatureAccess();
  const { hasPaidSubscription, subscription, loading: subLoading } = useSubscription();

  const isExpired = subscription?.status === "expired";
  const hasAccess = !isExpired || hasPaidSubscription;

  useEffect(() => {
    if (!user || !hasAccess) {
      setLoadingSaved(false);
      return;
    }
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
  }, [user, hasAccess]);

  const generate = async () => {
    if (isExpired) {
      toast({ title: "Subscription Expired", description: "Please renew your subscription.", variant: "destructive" });
      return;
    }

    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

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
      <div className="relative min-h-[calc(100vh-4rem)]" style={{ background: '#0A0A0A', padding: '40px' }}>
        {isExpired && !subLoading && (
          <UpgradeOverlay message="Your subscription has expired. Please renew to continue using the Marketing Studio." />
        )}
        
        <div className={`max-w-[900px] mx-auto ${isExpired && !subLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>Marketing Studio</h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#555555' }}>Generate platform-optimized marketing content with AI.</p>
            {isFreePlan && !isExpired && remaining !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {remaining > 0 ? `${remaining} generation${remaining === 1 ? "" : "s"} remaining today` : "Daily limit reached — upgrade to continue"}
              </p>
            )}
          </div>

          <Card style={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '32px', maxWidth: '580px' }} className="space-y-5">
            {userEbooks.length > 0 && (
              <div className="space-y-1.5">
                <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Select from your ebooks</label>
                <Select value={selectedEbook} onValueChange={(v) => {
                  setSelectedEbook(v);
                  if (v !== "custom") {
                    const ebook = userEbooks.find(e => e.id === v);
                    if (ebook) {
                      setTitle(ebook.title);
                      setDescription(ebook.description || ebook.topic);
                    }
                  }
                }}>
                  <SelectTrigger style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', padding: '12px 14px', width: '100%' }} className="h-auto">
                    <SelectValue placeholder="Choose an ebook or enter manually" />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#161616', border: '1px solid #1A1A1A', color: '#FFFFFF' }}>
                    <SelectItem value="custom">Enter manually</SelectItem>
                    {userEbooks.map(eb => (
                      <SelectItem key={eb.id} value={eb.id}>{eb.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Title</label>
              <Input 
                placeholder="e.g. Launch of my SaaS tool" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                disabled={loading || !hasAccess} 
                style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', padding: '12px 14px', width: '100%' }}
                className="placeholder:text-[#333333] focus:border-[rgba(255,255,255,0.25)]"
              />
            </div>
            <div className="space-y-1.5">
              <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Description</label>
              <Textarea 
                placeholder="What is your product/offer about?" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                disabled={loading || !hasAccess} 
                rows={4} 
                style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', padding: '12px 14px', width: '100%', minHeight: '100px', resize: 'vertical' }}
                className="placeholder:text-[#333333] focus:border-[rgba(255,255,255,0.25)]"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end', marginTop: '20px' }}>
              <div className="space-y-1.5">
                <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '8px', display: 'block' }}>Platform</label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as "instagram" | "x")} disabled={loading || !hasAccess}>
                  <SelectTrigger style={{ background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', padding: '12px 14px', width: '100%' }} className="h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#161616', border: '1px solid #1A1A1A', color: '#FFFFFF' }}>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={generate} 
                disabled={loading || !hasAccess || (isFreePlan && remaining === 0)} 
                style={{ background: '#FFFFFF', color: '#0A0A0A', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '6px', border: 'none', whiteSpace: 'nowrap' }}
                className="hover:bg-[#F0F0F0]"
              >
                {loading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                Generate Posts
              </Button>
            </div>
          </Card>

          {results.length === 0 && !loadingSaved && (
            <div style={{ maxWidth: '580px', marginTop: '16px', background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '10px', padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#2A2A2A' }}>Your generated posts will appear here</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Saved Results</h2>
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {results.map((result) => (
                    <motion.div key={result.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} layout>
                      <Card style={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '20px' }} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px]">{result.platform === "instagram" ? "Instagram" : "X (Twitter)"}</Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => copyResult(result)} className="gap-1 text-xs h-8 text-white hover:bg-white/10">
                              {copiedId === result.id ? <CheckIcon className="w-3.5 h-3.5 text-primary" /> : <CopyIcon className="w-3.5 h-3.5" />}
                              Copy
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(result.id)} className="gap-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <TrashIcon className="w-3.5 h-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3 divide-y divide-border/50">
                          <div className="pt-1">
                            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '4px' }}>Hook</p>
                            <p className="font-medium text-sm text-white">{result.hook}</p>
                          </div>
                          <div className="pt-3">
                            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '4px' }}>Main Copy</p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{result.main_copy}</p>
                          </div>
                          <div className="pt-3">
                            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '4px' }}>CTA</p>
                            <p className="text-sm font-medium text-primary">{result.cta}</p>
                          </div>
                          {result.hashtags && (
                            <div className="pt-3">
                              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '4px' }}>Hashtags</p>
                              <p className="text-sm text-muted-foreground">{result.hashtags}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#111111] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>Delete this result?</DialogTitle>
            <DialogDescription className="text-[#555555]">This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-[#1A1A1A] text-white hover:bg-white/10">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteResult(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MarketingStudio;
