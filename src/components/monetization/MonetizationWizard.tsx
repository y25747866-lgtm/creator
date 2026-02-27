import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Rocket,
  Megaphone,
  Copy,
  Trash2,
  Download
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import { useEbookStore } from "@/hooks/useEbookStore";

import { supabase } from "@/integrations/supabase/client";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "select" | "details" | "generating" | "done" | "detail";

interface Asset {
  id: string;
  asset_type: string;
  content: string;
  created_at: string;
}

const MarketingWizard = ({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>("select");

  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const [sourceEbookId, setSourceEbookId] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<GenerationStatus[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [assets, setAssets] = useState<Asset[]>([]);

  const { toast } = useToast();

  const ebooks = useEbookStore((s) => s.ebooks);

  const selectedEbook = ebooks.find((e) => e.id === sourceEbookId);

  const ASSET_TYPES = [
    { value: "sales_page", label: "Sales Page" },
    { value: "email_sequence", label: "Email Sequence" },
    { value: "twitter_posts", label: "Twitter/X Posts" },
    { value: "youtube_description", label: "YouTube Description" },
    { value: "landing_page", label: "Landing Page" },
    { value: "product_description", label: "Product Description" },
    { value: "cta_blocks", label: "CTA Blocks" },
  ];

  function toggleAsset(val: string) {
    setSelectedAssets((prev) =>
      prev.includes(val)
        ? prev.filter((v) => v !== val)
        : [...prev, val]
    );
  }

  function handleStartDetails() {
    if (selectedAssets.length === 0) {
      toast({
        title: "Select at least one asset",
        variant: "destructive",
      });
      return;
    }

    if (selectedEbook) {
      setTitle(selectedEbook.title);
      setTopic(selectedEbook.topic);
      setDescription(selectedEbook.description || "");
    }

    setStep("details");
  }

  async function handleGenerate() {
    if (!title.trim() || !topic.trim()) {
      toast({
        title: "Title and topic required",
        variant: "destructive",
      });
      return;
    }

    setStep("generating");

    const initial = selectedAssets.map((at) => ({
      assetType: at,
      label: ASSET_TYPES.find((m) => m.value === at)?.label || at,
      status: "pending" as const,
    }));

    setStatuses(initial);

    try {
      const { product } = await createMonetizationProduct({
        title,
        topic,
        description,
        sourceType: sourceEbookId ? "ebook" : "idea",
        sourceProductId: sourceEbookId || undefined,
      });

      const sourceContent = selectedEbook?.content || "";

      for (let i = 0; i < selectedAssets.length; i++) {
        const at = selectedAssets[i];

        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "generating" } : s
          )
        );

        try {
          const { content } = await generateMarketingAsset({
            assetType: at,
            title,
            topic,
            description,
            sourceContent,
          });

          await sb.from("marketing_assets").insert({
            product_id: product.id,
            asset_type: at,
            content,
          });

          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "done" } : s
            )
          );
        } catch (err: any) {
          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "error", error: err.message } : s
            )
          );
        }
      }

      setStep("done");
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message,
        variant: "destructive",
      });

      setStep("details");
    }
  }

  async function handleViewProduct(product: any) {
    setSelectedProduct(product);

    const { data } = await sb
      .from("marketing_assets")
      .select("*")
      .eq("product_id", product.id);

    setAssets(data || []);

    setStep("detail");
  }

  async function handleDeleteAsset(id: string) {
    await sb.from("marketing_assets").delete().eq("id", id);
    setAssets(prev => prev.filter(a => a.id !== id));
  }

  async function handleDownloadPdf(ebookId: string) {
    // Implement PDF download logic here (from ebook_jobs content)
    toast({ title: "Downloading PDF..." });
  }

  const completed = statuses.filter(s => s.status === "done").length;
  const progress = statuses.length > 0 ? Math.round((completed / statuses.length) * 100) : 0;

  return (
    <Card className="p-8 max-w-2xl mx-auto">

      {step === "select" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">
                Choose Marketing Assets
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Turn your ebook or idea into a complete marketing system.
            </p>
          </div>

          {ebooks.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Source Ebook (optional)
              label>
              <select
                value={sourceEbookId || ""}
                onChange={(e) => setSourceEbookId(e.target.value || null)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background"
              >
                <option value="">
                  Start from scratch
                </option>
                {ebooks.map((eb) => (
                  <option key={eb.id} value={eb.id}>
                    {eb.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {MODULE_TYPES.map((mt) => {
              const active = selectedAssets.includes(mt.value);
              return (
                <motion.label
                  whileHover={{ scale: 1.02 }}
                  key={mt.value}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    active ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex gap-3">
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleAsset(mt.value)}
                    />
                    <div>
                      <div className="font-medium text-sm">{mt.label}</div>
                      <div className="text-xs text-muted-foreground">{mt.description}</div>
                    </div>
                  </div>
                </motion.label>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleStartDetails} disabled={selectedAssets.length === 0}>
              Next
            </Button>
          </div>
        </motion.div>
      )}

      {step === "details" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Marketing Campaign Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Topic / Niche</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Build Marketing System
            </Button>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Building Your Marketing System</h2>
          <Progress value={progress} />

          {statuses.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {s.status === "generating" && <Loader2 className="animate-spin w-4 h-4" />}
              {s.status === "done" && <CheckCircle2 className="text-green-500 w-4 h-4" />}
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {step === "done" && (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold">Marketing System Ready</h2>
          <p className="text-sm text-muted-foreground">{completed} assets created successfully.</p>
          <Button onClick={onComplete} className="w-full">View Assets</Button>
        </div>
      )}

      {step === "detail" && selectedProduct && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">{selectedProduct.title}</h2>

          <div className="grid gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{asset.asset_type.replace("_", " ").toUpperCase()}</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => navigator.clipboard.writeText(asset.content)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteAsset(asset.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Created: {asset.created_at}</p>
                <div className="prose max-w-none">
                  <Markdown content={asset.content} />
                </div>
              </div>
            ))}
          </div>

          <Button variant="ghost" onClick={() => setStep("select")}>
            Back
          </Button>
        </div>
      )}

    </Card>
  );
};

export default MarketingWizard;
