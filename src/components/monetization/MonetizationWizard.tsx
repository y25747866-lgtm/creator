import { useState } from "react";
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
  AlertCircle,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import {
  MODULE_TYPES,
  ModuleType,
  createMonetizationProduct,
  createMonetizationModule,   // ✅ added
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
  const selectedEbook = ebooks.find((e) => e.id === sourceEbookId);

  function toggleModule(val: ModuleType) {
    setSelectedModules((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  function handleStartDetails() {
    if (selectedModules.length === 0) {
      toast({ title: "Select at least one marketing asset", variant: "destructive" });
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
      toast({ title: "Title and topic required", variant: "destructive" });
      return;
    }

    setStep("generating");

    const initial = selectedModules.map((mt) => ({
      moduleType: mt,
      label: MODULE_TYPES.find((m) => m.value === mt)?.label || mt,
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

      for (let i = 0; i < selectedModules.length; i++) {
        const mt = selectedModules[i];
        const label = MODULE_TYPES.find((m) => m.value === mt)?.label || mt;

        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "generating" } : s
          )
        );

        try {
          // ✅ FIXED: use safe function instead of direct insert
          const { module } = await createMonetizationModule({
            productId: product.id,
            moduleType: mt,
            title: `${label} — ${title}`,
          });

          // generate AI content
          await generateModuleContent({ moduleId: module.id });

          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "done" } : s
            )
          );
        } catch (err: any) {
          const errorMsg = err.message || "Unknown error";

          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "error", error: errorMsg } : s
            )
          );

          toast({
            title: `Failed ${label}`,
            description: errorMsg,
            variant: "destructive",
          });
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

  const completed = statuses.filter((s) => s.status === "done").length;
  const progress =
    statuses.length > 0
      ? Math.round((completed / statuses.length) * 100)
      : 0;

  return (
    <Card className="p-8 max-w-2xl mx-auto">

      {/* SELECT */}
      {step === "select" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Choose Marketing Assets</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Turn your ebook or idea into a complete marketing system.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MODULE_TYPES.map((mt) => {
              const active = selectedModules.includes(mt.value);

              return (
                <motion.label
                  whileHover={{ scale: 1.02 }}
                  key={mt.value}
                  className={`p-4 rounded-xl border-2 cursor-pointer ${
                    active ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex gap-3">
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleModule(mt.value)}
                    />
                    <div>
                      <div className="font-medium text-sm">{mt.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {mt.description}
                      </div>
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
            <Button
              onClick={handleStartDetails}
              disabled={selectedModules.length === 0}
            >
              Next
            </Button>
          </div>

        </motion.div>
      )}

      {/* DETAILS */}
      {step === "details" && (
        <div className="space-y-6">

          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Marketing Campaign Details</h2>
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Campaign name"
          />

          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic"
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep("select")}>
              Back
            </Button>

            <Button onClick={handleGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              Build Marketing System
            </Button>
          </div>

        </div>
      )}

      {/* GENERATING */}
      {step === "generating" && (
        <div className="space-y-4">
          <Progress value={progress} />

          {statuses.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">

              {s.status === "generating" && (
                <Loader2 className="animate-spin w-4 h-4" />
              )}

              {s.status === "done" && (
                <CheckCircle2 className="text-green-500 w-4 h-4" />
              )}

              {s.status === "error" && (
                <AlertCircle className="text-red-500 w-4 h-4" />
              )}

              {s.label}

              {s.error && (
                <span className="text-red-500 text-xs">
                  {s.error}
                </span>
              )}

            </div>
          ))}

        </div>
      )}

      {/* DONE */}
      {step === "done" && (
        <div className="text-center space-y-4">

          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />

          <h2 className="text-xl font-bold">
            Marketing System Ready
          </h2>

          <p className="text-sm text-muted-foreground">
            {completed} assets created successfully.
          </p>

          <Button onClick={onComplete} className="w-full">
            View Assets
          </Button>

        </div>
      )}

    </Card>
  );
};

export default MonetizationWizard;
