import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MODULE_TYPES,
  ModuleType,
  createMonetizationProduct,
  createMonetizationModule,
  generateModuleContent,
} from "@/lib/monetization";
import { useEbookStore } from "@/hooks/useEbookStore";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "select" | "details" | "generating" | "done";

interface GenerationStatus {
  moduleType: string;
  label: string;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
}

const MonetizationWizard = ({ onComplete, onCancel }: Props) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedModules, setSelectedModules] = useState<ModuleType[]>([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [sourceEbookId, setSourceEbookId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<GenerationStatus[]>([]);
  const { toast } = useToast();

  const ebooks = useEbookStore((s) => s.ebooks);

  const toggleModule = (val: ModuleType) => {
    setSelectedModules((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const selectedEbook = ebooks.find((e) => e.id === sourceEbookId);

  const handleStartDetails = () => {
    if (selectedModules.length === 0) {
      toast({ title: "Select at least one module", variant: "destructive" });
      return;
    }
    // Pre-fill from ebook if selected
    if (selectedEbook) {
      setTitle(selectedEbook.title);
      setTopic(selectedEbook.topic);
      setDescription(selectedEbook.description || "");
    }
    setStep("details");
  };

  const handleGenerate = async () => {
    if (!title.trim() || !topic.trim()) {
      toast({ title: "Title and topic are required", variant: "destructive" });
      return;
    }

    setStep("generating");
    const initial: GenerationStatus[] = selectedModules.map((mt) => ({
      moduleType: mt,
      label: MODULE_TYPES.find((m) => m.value === mt)?.label || mt,
      status: "pending",
    }));
    setStatuses(initial);

    try {
      // 1. Create product
      const { product } = await createMonetizationProduct({
        title,
        topic,
        description,
        sourceType: sourceEbookId ? "ebook" : "idea",
        sourceProductId: sourceEbookId || undefined,
      });

      const sourceContent = selectedEbook?.content || "";

      // 2. Generate each module sequentially
      for (let i = 0; i < selectedModules.length; i++) {
        const mt = selectedModules[i];
        const modLabel = MODULE_TYPES.find((m) => m.value === mt)?.label || mt;

        setStatuses((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "generating" } : s))
        );

        try {
          // Create module record
          const { module } = await createMonetizationModule({
            productId: product.id,
            moduleType: mt,
            title: `${modLabel} — ${title}`,
          });

          // Generate content
          await generateModuleContent({
            moduleId: module.id,
            moduleType: mt,
            title,
            topic,
            description,
            sourceContent,
          });

          setStatuses((prev) =>
            prev.map((s, idx) => (idx === i ? { ...s, status: "done" } : s))
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
      toast({ title: "Failed", description: err.message, variant: "destructive" });
      setStep("details");
    }
  };

  const completedCount = statuses.filter((s) => s.status === "done").length;
  const progress =
    statuses.length > 0 ? Math.round((completedCount / statuses.length) * 100) : 0;

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      {/* Step: Select Modules */}
      {step === "select" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Choose Monetization Assets</h2>
            <p className="text-sm text-muted-foreground">
              Select which products to generate from your content.
            </p>
          </div>

          {/* Optional: select source ebook */}
          {ebooks.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Source Ebook <span className="text-muted-foreground">(optional)</span>
              </label>
              <select
                value={sourceEbookId || ""}
                onChange={(e) => setSourceEbookId(e.target.value || null)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Start from scratch</option>
                {ebooks.map((eb) => (
                  <option key={eb.id} value={eb.id}>
                    {eb.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {MODULE_TYPES.map((mt) => (
              <label
                key={mt.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedModules.includes(mt.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Checkbox
                  checked={selectedModules.includes(mt.value)}
                  onCheckedChange={() => toggleModule(mt.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">{mt.label}</div>
                  <div className="text-xs text-muted-foreground">{mt.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleStartDetails} disabled={selectedModules.length === 0}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Product Details</h2>
            <p className="text-sm text-muted-foreground">
              Describe the product these assets will be built from.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Digital Product Mastery"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Topic *</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Building and selling digital products online"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the product..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!title.trim() || !topic.trim()}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate {selectedModules.length} Asset{selectedModules.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Generating */}
      {step === "generating" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Building Your Assets</h2>
            <p className="text-sm text-muted-foreground">
              AI is creating production-ready monetization assets.
            </p>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="space-y-3">
            {statuses.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                {s.status === "pending" && (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                )}
                {s.status === "generating" && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {s.status === "done" && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {s.status === "error" && (
                  <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center text-destructive text-xs font-bold">!</div>
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium">{s.label}</span>
                  {s.status === "generating" && (
                    <span className="text-xs text-muted-foreground ml-2">Generating...</span>
                  )}
                  {s.error && (
                    <span className="text-xs text-destructive ml-2">{s.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="text-center space-y-6 py-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Assets Created</h2>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {statuses.length} assets generated successfully.
            </p>
          </div>
          <Button onClick={onComplete} className="w-full">
            View Assets
          </Button>
        </div>
      )}
    </Card>
  );
};

export default MonetizationWizard;
