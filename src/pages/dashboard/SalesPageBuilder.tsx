import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Trash2, CheckCircle2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [offerDetails, setOfferDetails] = useState("");
  const [drafts, setDrafts] = useState<SalesPageDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showEbookSelector, setShowEbookSelector] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const allEbooks = useEbookStore((s) => s.ebooks);

  const { hasPaidSubscription, subscription, loading: subLoading } = useSubscription();
  const { recordUsage, getRemainingUses, isFreePlan } = useFeatureAccess();
  
  const isExpired = subscription?.status === "expired";
  const hasAccess = !isExpired || hasPaidSubscription;

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

  const selectEbookFromHistory = (ebook: Ebook) => {
    setTitle(ebook.title);
    setDescription(ebook.topic || "");
    setTargetAudience("");
    setOfferDetails("");
    setShowEbookSelector(false);
    toast({ title: "Ebook selected", description: `"${ebook.title}" loaded for sales page generation.` });
  };

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
        {/* LOCK ONLY FOR EXPIRED USERS */}
        {isExpired && !subLoading && (
          <UpgradeOverlay message="Your subscription has expired. Please renew to continue using the Sales Page Builder." />
        )}

        <div className={`max-w-[900px] mx-auto ${isExpired && !subLoading ? "opacity-50 pointer-events-none" : ""}`}>
          <div style={{ marginBottom: '32px' }}>
            <span style={{ display: 'inline-block', background: '#111111', border: '1px solid #1A1A1A', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: '12px' }}>
              SALES PAGE GENERATOR
            </span>
            <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Sales Page Builder
            </h1>
            <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: '#666666', maxWidth: '580px' }}>
              Create high-converting sales pages that sell. Write the title, description, what's inside, who it's for, and why they need it—everything laid out in the right order. The Sales Page Builder generates all of that for you.
            </p>
          </div>

          <Card style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '32px', maxWidth: '580px', marginBottom: '16px' }}>
            <div className="space-y-0">
              {/* Select from History Button */}
              {allEbooks.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    onClick={() => setShowEbookSelector(!showEbookSelector)}
                    style={{
                      background: '#161616',
                      border: '1px solid #1A1A1A',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontFamily: 'DM Sans',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '12px 14px',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2A2A2A';
                      e.currentTarget.style.background = '#1A1A1A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1A1A1A';
                      e.currentTarget.style.background = '#161616';
                    }}
                  >
                    <span>Select from Ebook History</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showEbookSelector ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showEbookSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: '#161616',
                        border: '1px solid #1A1A1A',
                        borderRadius: '6px',
                        marginTop: '8px',
                        maxHeight: '240px',
                        overflowY: 'auto'
                      }}
                    >
                      {allEbooks.map((ebook) => (
                        <button
                          key={ebook.id}
                          onClick={() => selectEbookFromHistory(ebook)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            textAlign: 'left',
                            borderBottom: '1px solid #0D0D0D',
                            background: 'transparent',
                            color: '#FFFFFF',
                            fontFamily: 'DM Sans',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                            border: 'none'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A1A'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{ebook.title}</div>
                          <div style={{ fontSize: '11px', color: '#555555' }}>{ebook.topic}</div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                  
                  <div style={{ height: '1px', background: '#1A1A1A', margin: '20px 0' }} />
                </div>
              )}

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
                    transition: 'background 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate 3 Sales Page Drafts
                </button>
              </div>
            </div>
          </Card>

          {drafts.length === 0 && (
            <div style={{ maxWidth: '580px', background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '10px', padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#2A2A2A' }}>
                Your generated sales pages will appear here
              </p>
            </div>
          )}

          {drafts.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Saved Results
              </h2>
            </div>
          )}

          <AnimatePresence>
            {drafts.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {drafts.map((draft) => (
                  <motion.div key={draft.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <Card style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '24px', transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <span style={{ display: 'inline-block', background: '#161616', border: '1px solid #1A1A1A', color: '#555555', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>
                          Sales Page Draft
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => copyDraft(draft)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #1A1A1A',
                              borderRadius: '4px',
                              color: copiedId === draft.id ? '#FFFFFF' : '#555555',
                              fontFamily: 'DM Sans',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#2A2A2A';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#1A1A1A';
                              e.currentTarget.style.color = '#555555';
                            }}
                          >
                            {copiedId === draft.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(draft.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #1A1A1A',
                              borderRadius: '4px',
                              color: '#555555',
                              fontFamily: 'DM Sans',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#CC3333';
                              e.currentTarget.style.color = '#FF6666';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#1A1A1A';
                              e.currentTarget.style.color = '#555555';
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                      <div style={{ cursor: 'text', userSelect: 'text' }} onClick={handleSelectText}>
                        <div style={{ marginBottom: '20px' }}>
                          <h3 style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>{draft.headline}</h3>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#666666' }}>{draft.subheadline}</p>
                        </div>
                        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px', marginBottom: '16px' }}>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>The Problem</p>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#CCCCCC', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{draft.problem}</p>
                        </div>
                        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px', marginBottom: '16px' }}>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>The Solution</p>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#CCCCCC', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{draft.solution}</p>
                        </div>
                        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px', marginBottom: '16px' }}>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Benefits</p>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#CCCCCC', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{draft.benefits}</p>
                        </div>
                        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px', background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', padding: '12px' }}>
                          <p style={{ fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Call to Action</p>
                          <p style={{ fontFamily: 'Syne', fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{draft.cta}</p>
                        </div>
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
        <DialogContent style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Delete this draft?</DialogTitle>
            <DialogDescription style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#666666' }}>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
            <button
              onClick={() => setDeleteConfirm(null)}
              style={{
                background: 'transparent',
                border: '1px solid #1A1A1A',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontFamily: 'DM Sans',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2A2A2A';
                e.currentTarget.style.background = '#161616';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1A1A1A';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirm && deleteDraft(deleteConfirm)}
              style={{
                background: '#CC3333',
                border: 'none',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontFamily: 'DM Sans',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FF6666'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#CC3333'}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SalesPageBuilder;
