import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Trash2, CheckCircle2, Sparkles, ChevronDown } from "lucide-react";
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
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { useEbookStore } from "@/hooks/useEbookStore";

interface SalesPageDraft {
  id: string;
  headline: string;
  subheadline: string;
  problem: string;
  solution: string;
  benefits: string;
  cta: string;
}

const SalesPageBuilder = () => {
  const { user } = useAuth();
  const { getEbooksForUser } = useEbookStore();
  const userEbooks = user ? getEbooksForUser(user.id) : [];
  const [selectedEbook, setSelectedEbook] = useState<string>("custom");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [offerDetails, setOfferDetails] = useState("");
  const [drafts, setDrafts] = useState<SalesPageDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { hasPaidSubscription, subscription, loading: subLoading } = useSubscription();
  const { recordUsage, getRemainingUses, isFreePlan } = useFeatureAccess();
  
  const isExpired = subscription?.status === "expired";
  const isCreatorOrAbove = (subscription?.plan_type === "creator" || subscription?.plan_type === "pro") && !isExpired;
  const hasAccess = isCreatorOrAbove;

  // Load saved results
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("saved_sales_page_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setDrafts(data.map((d: any) => ({
          id: d.id, headline: d.headline, subheadline: d.subheadline,
          problem: d.problem, solution: d.solution, benefits: d.benefits, cta: d.cta,
        })));
      }
    };
    load();
  }, [user, hasAccess]);

  const generate = async () => {
    if (isExpired) {
      toast({ title: "Subscription Expired", description: "Please renew your subscription.", variant: "destructive" });
      return;
    }

    // Check free plan daily limit
    const allowed = await recordUsage("sales_page_builder");
    if (!allowed) return;

    if (!title.trim()) {
      toast({ title: "Product title is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing", {
        body: { platform: "sales_page", title: title.trim(), description: description.trim(), targetAudience: targetAudience.trim(), offerDetails: offerDetails.trim() },
      });

      if (error) throw new Error(error.message);
      
      const results = data?.results;
      if (!results || !Array.isArray(results)) {
        throw new Error("Invalid response from AI");
      }

      const newDrafts: SalesPageDraft[] = [];
      
      for (const r of results) {
        const { data: saved, error: saveErr } = await supabase
          .from("saved_sales_page_results")
          .insert({
            user_id: user!.id,
            headline: r.headline || "", subheadline: r.subheadline || "",
            problem: r.problem || "", solution: r.solution || "",
            benefits: r.benefits || "", cta: r.cta || "",
          })
          .select()
          .single();

        if (saveErr) {
          console.error("Save error:", saveErr);
        }
        
        if (saved) {
          newDrafts.push({ id: saved.id, headline: saved.headline, subheadline: saved.subheadline, problem: saved.problem, solution: saved.solution, benefits: saved.benefits, cta: saved.cta });
        }
      }

      setDrafts((prev) => [...newDrafts, ...prev]);
      toast({ title: "Sales page drafts generated!", description: `${newDrafts.length} drafts created` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = async (draft: SalesPageDraft) => {
    const text = `# ${draft.headline}\n## ${draft.subheadline}\n\n### The Problem\n${draft.problem}\n\n### The Solution\n${draft.solution}\n\n### Benefits\n${draft.benefits}\n\n### ${draft.cta}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(draft.id);
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

  const deleteDraft = async (id: string) => {
    await supabase.from("saved_sales_page_results").delete().eq("id", id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirm(null);
    toast({ title: "Deleted" });
  };

  const labelStyle = {
    fontFamily: 'DM Sans',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#555555',
    marginBottom: '8px',
    display: 'block'
  };

  const inputStyle = {
    background: '#161616',
    border: '1px solid #1A1A1A',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: '14px',
    padding: '12px 14px',
    width: '100%',
    marginBottom: '20px'
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-screen" style={{ background: '#0A0A0A', padding: '40px' }}>
        {/* LOCK FOR FREE/EXPIRED USERS */}
        {!hasAccess && !subLoading && (
          <UpgradeOverlay message={isExpired ? "Your subscription has expired. Please renew to continue using the Sales Page Builder." : "Sales Page Builder is available on Creator and Pro plans. Upgrade to unlock."} />
        )}

        <div className={`max-w-[900px] mx-auto ${!hasAccess && !subLoading ? "opacity-50 pointer-events-none" : ""}`}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
              Sales Page Builder
            </h1>
            <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#555555' }}>
              Generate conversion-focused sales page copy with AI.
            </p>
          </div>

          <Card style={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '32px', maxWidth: '580px' }}>
            <div className="space-y-0">
              <div>
                <label style={labelStyle}>Product Title</label>
                <Input 
                  placeholder="Your product name" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  disabled={loading || !hasAccess} 
                  style={inputStyle}
                  className="placeholder:text-[#333333] focus:border-[rgba(255,255,255,0.25)] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <label style={labelStyle}>Product Description</label>
                <Textarea 
                  placeholder="Describe what your product does" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={loading || !hasAccess} 
                  rows={4} 
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                  className="placeholder:text-[#333333] focus:border-[rgba(255,255,255,0.25)] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Target Audience <span style={{ color: '#444444', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
                </label>
                <Input 
                  placeholder="Who is this product for?" 
                  value={targetAudience} 
                  onChange={(e) => setTargetAudience(e.target.value)} 
                  disabled={loading || !hasAccess} 
                  style={inputStyle}
                  className="placeholder:text-[#333333] focus:border-[rgba(255,255,255,0.25)] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Offer Details <span style={{ color: '#444444', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
                </label>
                <Input 
                  placeholder="e.g. pricing, bonuses, guarantees" 
                  value={offerDetails} 
                  onChange={(e) => setOfferDetails(e.target.value)} 
                  disabled={loading || !hasAccess} 
                  style={inputStyle}
                  className="placeholder:text-[#333333] focus:border-[rgba(255,255,255,0.25)] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div style={{ marginTop: '8px' }}>
                <button 
                  onClick={generate} 
                  disabled={loading || !hasAccess} 
                  style={{
                    background: '#FFFFFF',
                    color: '#0A0A0A',
                    fontFamily: 'Syne',
                    fontWeight: 700,
                    fontSize: '14px',
                    padding: '14px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    width: '100%',
                    height: '48px',
                    cursor: 'pointer',
                    transition: 'background 150ms ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Generate 3 Sales Page Drafts"}
                </button>
              </div>
            </div>
          </Card>

          {drafts.length === 0 && (
            <div style={{ maxWidth: '580px', marginTop: '16px', background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '10px', padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#2A2A2A' }}>
                Your generated sales pages will appear here
              </p>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="mt-8"><h2 className="text-sm font-semibold text-muted-foreground mb-3">Saved Results</h2></div>
          )}

          <AnimatePresence>
            {drafts.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {drafts.map((draft) => (
                  <motion.div key={draft.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} layout>
                    <Card className="rounded-2xl border border-border shadow-sm p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">Sales Page Draft</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => copyDraft(draft)} className="gap-1 text-xs h-8">
                            {copiedId === draft.id ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(draft.id)} className="gap-1 text-xs h-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3 divide-y divide-border/50 cursor-text" onClick={handleSelectText}>
                        <div><h3 className="text-lg font-bold">{draft.headline}</h3><p className="text-muted-foreground text-sm mt-0.5">{draft.subheadline}</p></div>
                        <div className="pt-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">The Problem</p><p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.problem}</p></div>
                        <div className="pt-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">The Solution</p><p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.solution}</p></div>
                        <div className="pt-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Benefits</p><p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.benefits}</p></div>
                        <div className="pt-3"><div className="p-3 rounded-lg bg-primary/5 border border-primary/10"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Call to Action</p><p className="font-medium text-primary text-sm">{draft.cta}</p></div></div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteDraft(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SalesPageBuilder;
