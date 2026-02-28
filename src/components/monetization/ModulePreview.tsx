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


interface Props {

  module: MonetizationModule;

  productTitle: string;

  onBack: () => void;

}


export default function ModulePreview({

  module,

  productTitle,

  onBack,

}: Props) {

  const { toast } = useToast();

  const [versions, setVersions] =
    useState<MonetizationVersion[]>([]);

  const [selectedVersion, setSelectedVersion] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [copied, setCopied] =
    useState(false);


  const typeLabel =
    MODULE_TYPES.find(
      (m) =>
        m.value ===
        module.module_type
    )?.label ||
    module.module_type;


  /*
  LOAD MODULE CONTENT
  */

  useEffect(() => {

    loadModule();

  }, [module.id]);


  async function loadModule() {

    try {

      setLoading(true);

      let res =
        await getModuleWithVersions(
          module.id
        );

      /*
      IF EMPTY → GENERATE FIRST VERSION
      */

      if (
        !res.versions ||
        res.versions.length === 0
      ) {

        setGenerating(true);

        await generateModuleContent({

          moduleId: module.id,

          moduleType:
            module.module_type,

          title:
            productTitle,

          topic:
            productTitle,

        });

        res =
          await getModuleWithVersions(
            module.id
          );

        setGenerating(false);

      }

      setVersions(
        res.versions || []
      );

      setSelectedVersion(

        res.versions?.[0]
          ?.version_number ||
          null

      );

      recordMonetizationMetric(

        module.id,

        "view"

      ).catch(() => {});

    } catch (err) {

      toast({

        title:
          "Failed to load asset",

        variant:
          "destructive",

      });

    } finally {

      setLoading(false);

    }

  }


  /*
  CURRENT VERSION
  */

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
    currentVersion?.content
      ?.markdown ||
    "";


  /*
  COPY
  */

  function handleCopy() {

    navigator.clipboard.writeText(
      markdown
    );

    setCopied(true);

    setTimeout(
      () =>
        setCopied(false),
      2000
    );

    recordMonetizationMetric(

      module.id,

      "copy"

    ).catch(() => {});

  }


  /*
  DOWNLOAD
  */

  function handleDownload() {

    const blob =
      new Blob(

        [markdown],

        {
          type:
            "text/plain",
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

    a.href =
      url;

    a.download =
      `${typeLabel}-${productTitle}.txt`;

    a.click();

    URL.revokeObjectURL(
      url
    );

    recordMonetizationMetric(

      module.id,

      "download"

    ).catch(() => {});

  }


  /*
  REGENERATE
  */

  async function handleRegenerate() {

    try {

      setGenerating(true);

      await generateModuleContent({

        moduleId:
          module.id,

        moduleType:
          module.module_type,

        title:
          productTitle,

        topic:
          productTitle,

      });

      await loadModule();

      toast({

        title:
          "New version generated",

      });

    } catch {

      toast({

        title:
          "Generation failed",

        variant:
          "destructive",

      });

    } finally {

      setGenerating(false);

    }

  }


  /*
  LOADING UI
  */

  if (loading)
    return (

      <Card className="p-8 space-y-4">

        <Skeleton className="h-8 w-48" />

        <Skeleton className="h-96 w-full" />

      </Card>

    );


  /*
  MAIN UI
  */

  return (

    <div className="space-y-6">

      <Button
        variant="outline"
        onClick={
          onBack
        }
      >
        ← Back
      </Button>


      <div className="flex justify-between items-center">

        <div>

          <Badge>

            {typeLabel}

          </Badge>

          <h2 className="text-xl font-bold mt-1">

            {module.title}

          </h2>

          {currentVersion && (

            <p className="text-xs text-muted-foreground">

              Created:

              {" "}

              {new Date(

                currentVersion.created_at

              ).toLocaleString()}

            </p>

          )}

        </div>


        <div className="flex gap-2">

          <Button

            variant="outline"

            onClick={
              handleRegenerate
            }

            disabled={
              generating
            }

          >

            {generating ?

              <Loader2 className="w-4 h-4 animate-spin"/>

              :

              <RefreshCw className="w-4 h-4"/>

            }

          </Button>


          <Button

            variant="outline"

            onClick={
              handleCopy
            }

          >

            {copied ?

              <CheckCircle2 className="w-4 h-4"/>

              :

              <Copy className="w-4 h-4"/>

            }

          </Button>


          <Button

            onClick={
              handleDownload
            }

          >

            <Download className="w-4 h-4"/>

          </Button>

        </div>

      </div>


      {versions.length > 1 && (

        <div className="flex gap-2">

          {versions.map(

            (v) => (

              <Button

                key={v.id}

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

                v

                {v.version_number}

              </Button>

            )

          )}

        </div>

      )}


      <Card className="p-6">

        {markdown ?

          (

            <textarea

              readOnly

              value={
                markdown
              }

              className="w-full h-[500px] bg-transparent outline-none text-sm"

            />

          )

          :

          (

            <p className="text-center">

              {generating ?

                "Generating..."

                :

                "No content"

              }

            </p>

          )

        }

      </Card>

    </div>

  );

          }
