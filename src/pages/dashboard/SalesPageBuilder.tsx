import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();

  const generate = async () => {
    if (!title.trim()) {
      toast({ title: "Product title is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing", {
        body: {
          platform: "sales_page",
          title: title.trim(),
          description: description.trim(),
          targetAudience: targetAudience.trim(),
          offerDetails: offerDetails.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.results || !Array.isArray(data.results)) {
        throw new Error("Invalid response from AI");
      }

      const newDrafts: SalesPageDraft[] = data.results.map((r: any, i: number) => ({
        id: `${Date.now()}-${i}`,
        headline: r.headline || "",
        subheadline: r.subheadline || "",
        problem: r.problem || "",
        solution: r.solution || "",
        benefits: r.benefits || "",
        cta: r.cta || "",
      }));

      setDrafts((prev) => [...newDrafts, ...prev]);
      toast({ title: "Sales page drafts generated!" });
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

  const deleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Sales Page Builder</h1>
          <p className="text-muted-foreground mt-2 text-base">Generate conversion-focused sales page copy with AI.</p>
        </div>

        <Card className="bg-card shadow-sm border border-border/60 rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Product Title</label>
            <Input
              placeholder="Your product name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="h-12 text-base rounded-xl border-border/60 focus-visible:ring-primary/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Product Description</label>
            <Textarea
              placeholder="Describe what your product does"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              className="text-base rounded-xl border-border/60 focus-visible:ring-primary/40 min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Target Audience <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="Who is this product for?"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={loading}
              className="h-12 text-base rounded-xl border-border/60 focus-visible:ring-primary/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Offer Details <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="e.g. pricing, bonuses, guarantees"
              value={offerDetails}
              onChange={(e) => setOfferDetails(e.target.value)}
              disabled={loading}
              className="h-12 text-base rounded-xl border-border/60 focus-visible:ring-primary/40"
            />
          </div>
          <div className="pt-2">
            <Button onClick={generate} disabled={loading} className="gap-2 h-12 px-6 rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate 3 Sales Page Drafts
            </Button>
          </div>
        </Card>

        <AnimatePresence>
          {drafts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {drafts.map((draft) => (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  layout
                >
                  <Card className="bg-card shadow-sm border border-border/60 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Sales Page Draft</Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => copyDraft(draft)} className="gap-1">
                          {copiedId === draft.id ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDraft(draft.id)} className="gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 divide-y divide-border/40">
                      <div>
                        <h3 className="text-xl font-bold">{draft.headline}</h3>
                        <p className="text-muted-foreground mt-1">{draft.subheadline}</p>
                      </div>

                      <div className="pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">The Problem</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.problem}</p>
                      </div>

                      <div className="pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">The Solution</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.solution}</p>
                      </div>

                      <div className="pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Benefits</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft.benefits}</p>
                      </div>

                      <div className="pt-4">
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Call to Action</p>
                          <p className="font-medium text-primary">{draft.cta}</p>
                        </div>
                      </div>
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

export default SalesPageBuilder;
