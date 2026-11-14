import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, Eye, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import DashboardLayout, { useDashboardAccess } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useOwnedEbooks } from "@/hooks/useOwnedEbooks";
import { useEbookStore, type Ebook } from "@/hooks/useEbookStore";
import { useToast } from "@/hooks/use-toast";
import { deleteGeneratedEbook } from "@/lib/ebookRepository";
import { generatePDF, downloadCoverImage } from "@/lib/pdfGenerator";
import { recordMetric } from "@/lib/productTracking";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function Downloads() {
  const { ebooks, loading, error, refresh, user } = useOwnedEbooks();
  const removeEbook = useEbookStore((state) => state.removeEbook);
  const access = useDashboardAccess();
  const { toast } = useToast();
  const [preview, setPreview] = useState<Ebook | null>(null);
  const [deleting, setDeleting] = useState<Ebook | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const hasAccess = access.hasPaidSubscription;

  const exportEbook = async (ebook: Ebook) => {
    if (!hasAccess) {
      toast({ title: "Upgrade required", description: access.isExpired ? "Renew your plan to download PDFs." : "PDF downloads require an active paid plan.", variant: "destructive" });
      return;
    }
    setDownloadingId(ebook.id);
    try {
      await generatePDF(ebook);
      if (ebook.dbProductId) void recordMetric(ebook.dbProductId, "download");
    } catch (reason) {
      toast({ title: "Download failed", description: reason instanceof Error ? reason.message : "Try again.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !user?.id) return;
    try {
      await deleteGeneratedEbook(deleting.id, user.id);
      removeEbook(deleting.id);
      if (preview?.id === deleting.id) setPreview(null);
      setDeleting(null);
      toast({ title: "Product deleted", description: "The saved product was removed from your account." });
      await refresh();
    } catch (reason) {
      toast({ title: "Could not delete product", description: reason instanceof Error ? reason.message : "Try again.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <main className="min-h-full bg-[#080A0C] px-4 pb-12 pt-6 text-white sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-white/45">Your workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Downloads</h1>
              <p className="mt-2 text-sm text-white/55">All generated products saved to your account.</p>
            </div>
            <Button asChild variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]"><Link to="/dashboard/products">Go to My Products</Link></Button>
          </header>

          {!hasAccess && <p className="rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-xs leading-5 text-white/65">Your saved products remain visible and deletable. PDF downloads require an active paid plan. <Link to="/pricing" className="text-white underline underline-offset-2">View plans</Link></p>}
          {error && <p role="alert" className="rounded-lg border border-white/10 bg-[#111318] px-4 py-3 text-sm text-white/65">Could not refresh your saved files: {error}</p>}

          {loading ? (
            <div role="status" aria-label="Loading generated files" className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-28 w-full bg-[#111318]" /><Skeleton className="h-28 w-full bg-[#111318]" /><Skeleton className="h-28 w-full bg-[#111318]" /><Skeleton className="h-28 w-full bg-[#111318]" /></div>
          ) : ebooks.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-[#111318] px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"><BookOpen size={21} className="text-white/55" /></div>
              <h2 className="text-lg font-medium">No saved products yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">Generate a product in Product Studio. Saved products will appear here and under My Products.</p>
              <Button asChild className="mt-5 bg-white text-[#080A0C] hover:bg-white/90"><Link to="/dashboard">Create a product</Link></Button>
            </section>
          ) : (
            <>
              <p className="text-xs text-white/45">{ebooks.length} {ebooks.length === 1 ? "saved product" : "saved products"}</p>
              <section aria-label="Saved downloads" className="space-y-2">
                {ebooks.map((ebook, index) => (
                  <motion.article key={ebook.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.25) }} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111318] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      {ebook.coverImageUrl ? (
                        <img src={ebook.coverImageUrl} alt="" width="40" height="52" className="h-[52px] w-10 shrink-0 rounded-md border border-white/10 object-cover" />
                      ) : (
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"><FileText size={17} className="text-white/65" /></div>
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-medium text-white">{ebook.title}</h2>
                        <p className="mt-1 truncate text-xs text-white/50">{ebook.topic}</p>
                        <p className="mt-1.5 text-[11px] text-white/40">{ebook.pages} estimated pages · saved {format(new Date(ebook.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Button size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]" onClick={() => setPreview(ebook)}><Eye size={14} className="mr-1.5" />Preview</Button>
                      {ebook.coverImageUrl && <Button size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]" onClick={() => void downloadCoverImage(ebook)}><ImageIcon size={14} className="mr-1.5" />Cover</Button>}
                      <Button size="sm" disabled={!hasAccess || downloadingId === ebook.id} title={hasAccess ? "Download PDF" : "Upgrade to download"} className="bg-white text-[#080A0C] hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40" onClick={() => void exportEbook(ebook)}>{downloadingId === ebook.id ? <Skeleton className="mr-1.5 h-3.5 w-3.5 rounded-sm" aria-label="Preparing download" /> : <Download size={14} className="mr-1.5" />}Download PDF</Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${ebook.title}`} className="h-9 w-9 text-white/55 hover:bg-white/[0.06] hover:text-white" onClick={() => setDeleting(ebook)}><Trash2 size={15} /></Button>
                    </div>
                  </motion.article>
                ))}
              </section>
            </>
          )}
        </div>

        <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
          <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto border-white/10 bg-[#111318] text-white">
            <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
            {preview?.coverImageUrl && <img src={preview.coverImageUrl} alt="" width="192" height="256" className="mx-auto mb-4 w-40 rounded-lg border border-white/10 object-cover" />}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-white/80">{preview?.content}</pre>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent className="border-white/10 bg-[#111318] text-white">
            <AlertDialogHeader><AlertDialogTitle>Delete saved product?</AlertDialogTitle><AlertDialogDescription className="text-white/55">“{deleting?.title}” and its saved versions will be removed from your account.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]">Cancel</AlertDialogCancel><AlertDialogAction className="bg-white text-[#080A0C] hover:bg-white/90" onClick={(event) => { event.preventDefault(); void confirmDelete(); }}><Trash2 size={14} className="mr-2" />Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </DashboardLayout>
  );
}
