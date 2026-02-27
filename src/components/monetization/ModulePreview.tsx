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
  Trash2,
  Calendar,
  ArrowLeft,
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

import { supabase } from "@/integrations/supabase/client";

interface Props {
  module: MonetizationModule;
  productTitle: string;
  onBack: () => void;
}

const ModulePreview = ({
  module,
  productTitle,
  onBack,
}: Props) => {

  const [versions, setVersions] =
    useState<MonetizationVersion[]>([]);

  const [selectedVersion,
    setSelectedVersion] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [regenerating,
    setRegenerating] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [deleting,
    setDeleting] =
    useState(false);

  const { toast } =
    useToast();

  const typeLabel =
    MODULE_TYPES.find(
      (m) =>
        m.value ===
        module.module_type
    )?.label ||
    module.module_type;

  useEffect(() => {

    load();

  }, [module.id]);

  async function load() {

    setLoading(true);

    try {

      const res =
        await getModuleWithVersions(
          module.id
        );

      setVersions(
        res.versions || []
      );

      if (
        res.versions?.length >
        0
      ) {

        setSelectedVersion(
          res.versions[0]
            .version_number
        );

      }

      recordMonetizationMetric(
        module.id,
        "view"
      ).catch(() => {});

    } catch {

      toast({
        title:
          "Failed to load module",
        variant:
          "destructive",
      });

    } finally {

      setLoading(false);

    }

  }

  const currentVersion =
    useMemo(
      () =>
        versions.find(
          (v) =>
            v.version_number ===
            selectedVersion
        ),
      [
        versions,
        selectedVersion,
      ]
    );

  const markdown =
    currentVersion
      ?.content
      ?.markdown || "";

  function formatDate(
    date?: string
  ) {

    if (!date)
      return "";

    return new Date(
      date
    ).toLocaleString();

  }

  async function handleRegenerate() {

    setRegenerating(true);

    try {

      await generateModuleContent(
        {
          moduleId:
            module.id,

          moduleType:
            module.module_type,

          title:
            productTitle,

          topic:
            productTitle,
        }
      );

      await load();

      toast({
        title:
          "New version generated",
      });

    } catch (err: any) {

      toast({
        title:
          "Regeneration failed",

        description:
          err.message,

        variant:
          "destructive",
      });

    } finally {

      setRegenerating(
        false
      );

    }

  }

  function handleCopy() {

    navigator.clipboard.writeText(
      markdown
    );

    setCopied(true);

    recordMonetizationMetric(
      module.id,
      "export"
    ).catch(() => {});

    setTimeout(
      () =>
        setCopied(false),
      2000
    );

  }

  function handleDownload() {

    const blob =
      new Blob(
        [markdown],
        {
          type:
            "text/markdown",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      `${typeLabel}-${productTitle}.md`
        .toLowerCase()
        .replace(
          /\s+/g,
          "-"
        );

    a.click();

    URL.revokeObjectURL(
      url
    );

    recordMonetizationMetric(
      module.id,
      "download"
    ).catch(() => {});

  }

  async function handleDelete() {

    if (
      !confirm(
        "Delete this asset?"
      )
    )
      return;

    setDeleting(true);

    try {

      await supabase
        .from(
          "monetization_modules"
        )
        .delete()
        .eq(
          "id",
          module.id
        );

      toast({
        title:
          "Deleted successfully",
      });

      onBack();

    } catch {

      toast({
        title:
          "Delete failed",
        variant:
          "destructive",
      });

    } finally {

      setDeleting(
        false
      );

    }

  }

  if (loading) {

    return (

      <Card className="p-8 space-y-4">

        <Skeleton className="h-8 w-48"/>

        <Skeleton className="h-96 w-full"/>

      </Card>

    );

  }

  return (

    <div className="space-y-6">

      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
      >

        <ArrowLeft className="w-4 h-4 mr-2"/>

        Back

      </Button>

      <div className="flex justify-between items-start flex-wrap gap-4">

        <div>

          <Badge variant="secondary">

            {typeLabel}

          </Badge>

          <h2 className="text-2xl font-bold">

            {module.title}

          </h2>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">

            <Calendar className="w-4 h-4"/>

            Created:
            {formatDate(
              module.created_at
            )}

          </div>

        </div>

        <div className="flex gap-2 flex-wrap">

          <Button
            variant="outline"
            size="sm"
            onClick={
              handleRegenerate
            }
            disabled={
              regenerating
            }
          >

            {regenerating
              ? <Loader2 className="w-4 h-4 animate-spin"/>
              : <RefreshCw className="w-4 h-4"/>}

            Regenerate

          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={
              handleCopy
            }
          >

            {copied
              ? <CheckCircle2 className="w-4 h-4 text-green-500"/>
              : <Copy className="w-4 h-4"/>}

            {copied
              ? "Copied"
              : "Copy"}

          </Button>

          <Button
            size="sm"
            onClick={
              handleDownload
            }
          >

            <Download className="w-4 h-4"/>

            Download

          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={
              handleDelete
            }
            disabled={
              deleting
            }
          >

            <Trash2 className="w-4 h-4"/>

            Delete

          </Button>

        </div>

      </div>

      {versions.length >
        1 && (

        <div className="flex gap-2">

          {versions.map(
            (v) => (

              <Button
                key={v.id}
                size="sm"
                variant={
                  v.version_number ===
                  selectedVersion
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setSelectedVersion(
                    v.version_number
                  )
                }
              >

                v{
                  v.version_number
                }

              </Button>

            )
          )}

        </div>

      )}

      <Card className="p-8">

        {markdown
          ? (

            <div className="whitespace-pre-wrap">

              {markdown}

            </div>

          )
          : (

            <p className="text-center text-muted-foreground">

              No content yet

            </p>

          )}

      </Card>

    </div>

  );

};

export default ModulePreview;
