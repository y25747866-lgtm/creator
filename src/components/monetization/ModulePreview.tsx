import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Download,
  RefreshCw,
  Copy,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MonetizationModule,
  MonetizationVersion,
  MODULE_TYPES,
  getModuleWithVersions,
  generateModuleContent,
  recordMonetizationMetric,
} from "@/lib/monetization";
import { format } from "date-fns";

interface Props {
  module: MonetizationModule;
  productTitle: string;
  onBack: () => void;
}

export default function ModulePreview({
  module,
  productTitle,
}: Props) {
  const [versions, setVersions] = useState<MonetizationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  const typeLabel =
    MODULE_TYPES.find(
      (m) => m.value === module.module_type
    )?.label || module.module_type;

  /*
  LOAD MODULE CONTENT
  */
  useEffect(() => {
    loadModule();
  }, [module.id]);

  async function loadModule() {
    try {
      setLoading(true);

      const res = await getModuleWithVersions(module.id);

      const list = res?.versions || [];

      setVersions(list);

      if (list.length > 0) {
        setSelectedVersion(list[0].version_number);
      }

      await recordMonetizationMetric(module.id, "view");

    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to load content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  /*
  CURRENT VERSION
  */
  const currentVersion = useMemo(
    () =>
      versions.find(
        (v) => v.version_number === selectedVersion
      ),
    [versions, selectedVersion]
  );

  const markdown =
    currentVersion?.content?.markdown || "";

  /*
  COPY
  */
  async function handleCopy() {
    if (!markdown) return;

    await navigator.clipboard.writeText(markdown);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

    recordMonetizationMetric(module.id, "copy");

    toast({
      title: "Copied to clipboard",
    });
  }

  /*
  DOWNLOAD
  */
  function handleDownload() {
    if (!markdown) return;

    const blob = new Blob(
      [markdown],
      { type: "text/markdown" }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `${typeLabel}-${productTitle}.md`
        .toLowerCase()
        .replace(/\s+/g, "-");

    a.click();

    URL.revokeObjectURL(url);

    recordMonetizationMetric(module.id, "download");
  }

  /*
  REGENERATE
  */
  async function handleRegenerate() {
    try {
      setRegenerating(true);

      await generateModuleContent({
        moduleId: module.id,
        moduleType: module.module_type,
        title: productTitle,
        topic: productTitle,
      });

      await loadModule();

      toast({
        title: "New content generated",
      });

    } catch (e: any) {

      toast({
        title: "Generation failed",
        description: e.message,
        variant: "destructive",
      });

    } finally {

      setRegenerating(false);

    }
  }

  /*
  LOADING UI
  */
  if (loading) {
    return (
      <Card className="p-8 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-96 w-full" />
      </Card>
    );
  }

  /*
  MAIN UI
  */
  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>

          <Badge className="mb-2">
            {typeLabel}
          </Badge>

          <h2 className="text-2xl font-bold">
            {module.title}
          </h2>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="w-4 h-4"/>
            {format(
              new Date(module.created_at),
              "MMM d, yyyy HH:mm"
            )}
          </div>

        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating
              ? <Loader2 className="w-4 h-4 animate-spin"/>
              : <RefreshCw className="w-4 h-4"/>}
            Regenerate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copied
              ? <CheckCircle2 className="w-4 h-4 text-green-500"/>
              : <Copy className="w-4 h-4"/>}
            Copy
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4"/>
            Download
          </Button>

        </div>

      </div>


      {/* VERSION SELECT */}

      {versions.length > 1 && (

        <div className="flex gap-2">

          {versions.map((v) => (

            <Button
              key={v.id}
              size="sm"
              variant={
                selectedVersion === v.version_number
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setSelectedVersion(
                  v.version_number
                )
              }
            >
              Version {v.version_number}
            </Button>

          ))}

        </div>

      )}


      {/* CONTENT */}

      <Card className="p-8">

        {markdown ? (

          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {markdown}
          </div>

        ) : (

          <div className="text-center py-16 space-y-3">

            <p className="text-muted-foreground">
              No content found.
            </p>

            <Button
              onClick={handleRegenerate}
            >
              Generate Content
            </Button>

          </div>

        )}

      </Card>

    </div>
  );
  }
