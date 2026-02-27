import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Copy,
  Trash2,
  Calendar,
  FileText,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  title: string;
  module_type: string;
  created_at: string;
}

export default function MonetizationAssetsViewer() {

  const { toast } = useToast();

  const [assets, setAssets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {

    const { data } = await supabase
      .from("monetization_modules")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setAssets(data);
  }

  async function openAsset(asset: any) {

    setSelected(asset);

    const { data } = await supabase
      .from("monetization_versions")
      .select("*")
      .eq("module_id", asset.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    setContent(data?.content?.markdown || "");

    setOpen(true);
  }

  async function copyContent() {

    await navigator.clipboard.writeText(content);

    toast({
      title: "Copied to clipboard",
    });
  }

  async function deleteAsset(id: string) {

    await supabase
      .from("monetization_modules")
      .delete()
      .eq("id", id);

    toast({
      title: "Deleted",
    });

    loadAssets();
    setOpen(false);
  }

  function formatDate(date: string) {

    return new Date(date).toLocaleString();
  }

  return (
    <div className="space-y-4">

      {assets.map(asset => (

        <Card
          key={asset.id}
          className="p-4 cursor-pointer hover:bg-muted transition"
          onClick={() => openAsset(asset)}
        >

          <div className="flex justify-between">

            <div>

              <div className="font-medium">
                {asset.title}
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1">

                <Calendar className="w-3 h-3"/>

                {formatDate(asset.created_at)}

              </div>

            </div>

          </div>

        </Card>

      ))}

      <Dialog open={open} onOpenChange={setOpen}>

        <DialogContent className="max-w-3xl">

          <DialogHeader>

            <DialogTitle>
              {selected?.title}
            </DialogTitle>

          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto whitespace-pre-wrap">

            {content}

          </div>

          <div className="flex gap-2 pt-4">

            <Button onClick={copyContent} variant="outline">

              <Copy className="w-4 h-4 mr-2"/>

              Copy

            </Button>

            <Button
              variant="destructive"
              onClick={() => deleteAsset(selected.id)}
            >

              <Trash2 className="w-4 h-4 mr-2"/>

              Delete

            </Button>

          </div>

        </DialogContent>

      </Dialog>

    </div>
  );
}
