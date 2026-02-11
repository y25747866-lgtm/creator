import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Download, RefreshCw, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MonetizationModule,
  MonetizationVersion,
  MODULE_TYPES,
  getModuleWithVersions,
  generateModuleContent,
  recordMonetizationMetric,
} from "@/lib/monetization";

interface Props {
  module: MonetizationModule;
  productTitle: string;
  onBack: () => void;
}

const ModulePreview = ({ module, productTitle, onBack }: Props) => {
  const [versions, setVersions] = useState<MonetizationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const typeLabel =
    MODULE_TYPES.find((m) => m.value === module.module_type)?.label || module.module_type;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getModuleWithVersions(module.id);
        setVersions(res.versions || []);
        if (res.versions?.length > 0) {
          setSelectedVersion(res.versions[0].version_number);
        }
        recordMonetizationMetric(module.id, "view").catch(() => {});
      } catch {
        toast({ title: "Failed to load module", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [module.id]);

  const currentVersion = useMemo(
    () => versions.find((v) => v.version_number === selectedVersion),
    [versions, selectedVersion]
  );

  const markdown = currentVersion?.content?.markdown || "";

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await generateModuleContent({
        moduleId: module.id,
        moduleType: module.module_type,
        title: productTitle,
        topic: productTitle,
      });
      // Reload versions
      const updated = await getModuleWithVersions(module.id);
      setVersions(updated.versions || []);
      setSelectedVersion(updated.versions?.[0]?.version_number || null);
      toast({ title: "New version generated" });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    recordMonetizationMetric(module.id, "export").catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${typeLabel.toLowerCase().replace(/\s+/g, "-")}-${productTitle.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    recordMonetizationMetric(module.id, "download").catch(() => {});
  };

  if (loading) {
    return (
      <Card className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-96 w-full" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">{typeLabel}</Badge>
          <h2 className="text-2xl font-bold">{module.title}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="gap-1.5"
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Version selector */}
      {versions.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {versions.map((v) => (
            <Button
              key={v.id}
              variant={v.version_number === selectedVersion ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVersion(v.version_number)}
            >
              v{v.version_number}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <Card className="p-8">
        {markdown ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {markdown}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            No content generated yet. Click Regenerate to create content.
          </p>
        )}
      </Card>
    </div>
  );
};

export default ModulePreview;
