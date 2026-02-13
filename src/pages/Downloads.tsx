import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Image, Eye, Trash2, BookOpen } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { generatePDF, downloadCoverImage } from "@/lib/pdfGenerator";
import { format } from "date-fns";
import { useFreeTrial } from "@/hooks/useFreeTrial";
import TrialExpiredModal from "@/components/TrialExpiredModal";
import { useToast } from "@/hooks/use-toast";

const Downloads = () => {
  const { ebooks, removeEbook } = useEbookStore();
  const [previewEbook, setPreviewEbook] = useState<Ebook | null>(null);
  const { isFreeUser, expired } = useFreeTrial();
  const { toast } = useToast();

  const guardedDownload = (fn: () => void) => {
    if (isFreeUser) {
      toast({ title: "Upgrade Required", description: "Downloads are available on paid plans.", variant: "destructive" });
      return;
    }
    fn();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">Download History</h1>
          <p className="text-muted-foreground">
            Access and manage all your generated ebooks.
          </p>
        </motion.div>

        {ebooks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="glass-panel p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No ebooks yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first ebook to see it here.
              </p>
              <Button onClick={() => (window.location.href = "/dashboard/ebook-generator")}>
                Create Ebook
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {ebooks.map((ebook, index) => (
              <motion.div
                key={ebook.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="glass-panel p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Cover */}
                    <div className="w-full md:w-32 shrink-0">
                      {ebook.coverImageUrl ? (
                        <img
                          src={ebook.coverImageUrl}
                          alt={ebook.title}
                          className="w-full rounded-lg shadow-md"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center p-2">
                          <BookOpen className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{ebook.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <span>Pages: ~{ebook.pages}</span>
                        <span>Created: {format(new Date(ebook.createdAt), "MMM d, yyyy")}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          onClick={() => guardedDownload(() => generatePDF(ebook))}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => guardedDownload(() => downloadCoverImage(ebook))}
                          disabled={!ebook.coverImageUrl}
                        >
                          <Image className="w-4 h-4 mr-2" />
                          Cover
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewEbook(ebook)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeEbook(ebook.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewEbook} onOpenChange={() => setPreviewEbook(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewEbook?.title}</DialogTitle>
            </DialogHeader>
            
            {/* Cover Image Preview */}
            {previewEbook?.coverImageUrl && (
              <div className="mb-6">
                <img
                  src={previewEbook.coverImageUrl}
                  alt={previewEbook.title}
                  className="w-48 mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {previewEbook?.content.split("\n").map((line, i) => {
                if (line.startsWith("# ")) {
                  return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.replace("# ", "")}</h1>;
                }
                if (line.startsWith("## ")) {
                  return <h2 key={i} className="text-xl font-semibold mt-4 mb-3">{line.replace("## ", "")}</h2>;
                }
                if (line.startsWith("### ")) {
                  return <h3 key={i} className="text-lg font-medium mt-3 mb-2">{line.replace("### ", "")}</h3>;
                }
                if (line.trim()) {
                  return <p key={i} className="mb-3">{line}</p>;
                }
                return null;
              })}
            </div>
          </DialogContent>
        </Dialog>
      {isFreeUser && <TrialExpiredModal open={expired} />}
      </div>
    </DashboardLayout>
  );
};

export default Downloads;
