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
  const [statuses, setStatuses] = useState<GenerationStatus[]>([]);

  const { toast } = useToast();
  const ebooks = useEbookStore((s) => s.ebooks);

  function toggleModule(val: ModuleType) {
    setSelectedModules((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  function handleStartDetails() {
    if (selectedModules.length === 0) {
      toast({
        title: "Select at least one marketing asset",
        variant: "destructive",
      });
      return;
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

    const initial = selectedModules.map((mt) => ({
      moduleType: mt,
      label: MODULE_TYPES.find((m) => m.value === mt)?.label || mt,
      status: "pending" as const,
    }));

    setStatuses(initial);

    try {
      /* ✅ FIX — DO NOT destructure */
      const product = await createMonetizationProduct({
        title,
        topic,
        description,
        sourceType: "idea",
      });

      if (!product || !product.id) {
        throw new Error("Product creation failed — no ID returned");
      }

      for (let i = 0; i < selectedModules.length; i++) {
        const mt = selectedModules[i];
        const label =
          MODULE_TYPES.find((m) => m.value === mt)?.label || mt;

        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "generating" } : s
          )
        );

        try {
          const { module } = await createMonetizationModule({
            productId: product.id,
            moduleType: mt,
            title: `${label} — ${title}`,
          });

          if (!module || !module.id) {
            throw new Error("Module created but no ID returned");
          }

          await generateModuleContent({
            moduleId: module.id,
          });

          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "done" } : s
            )
          );
        } catch (err: any) {
          const msg = err.message || "Unknown error";

          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i
                ? { ...s, status: "error", error: msg }
                : s
            )
          );

          toast({
            title: `Failed ${label}`,
            description: msg,
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

  const completed = statuses.filter(
    (s) => s.status === "done"
  ).length;

  const progress =
    statuses.length > 0
      ? Math.round((completed / statuses.length) * 100)
      : 0;

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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MODULE_TYPES.map((mt) => {
              const active =
                selectedModules.includes(mt.value);

              return (
                <motion.label
                  key={mt.value}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 border-2 rounded-xl cursor-pointer ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex gap-3">
                    <Checkbox
                      checked={active}
                      onCheckedChange={() =>
                        toggleModule(mt.value)
                      }
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {mt.label}
                      </div>
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
            <Button
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>

            <Button onClick={handleStartDetails}>
              Next
            </Button>
          </div>
        </motion.div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <Input
            placeholder="Campaign name"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
          />

          <Input
            placeholder="Topic"
            value={topic}
            onChange={(e) =>
              setTopic(e.target.value)
            }
          />

          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <Button onClick={handleGenerate}>
            <Sparkles className="w-4 h-4 mr-2" />
            Build Marketing System
          </Button>
        </div>
      )}

      {step === "generating" && (
        <div className="space-y-4">
          <Progress value={progress} />

          {statuses.map((s, i) => (
            <div
              key={i}
              className="flex gap-2 items-center"
            >
              {s.status === "generating" && (
                <Loader2 className="animate-spin w-4 h-4" />
              )}

              {s.status === "done" && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}

              {s.status === "error" && (
                <AlertCircle className="w-4 h-4 text-red-500" />
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

      {step === "done" && (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />

          <h2 className="text-xl font-bold">
            Marketing System Ready
          </h2>

          <p>
            {completed} assets created successfully
          </p>

          <Button
            onClick={onComplete}
            className="w-full"
          >
            View Assets
          </Button>
        </div>
      )}
    </Card>
  );
};

export default MonetizationWizard;
