import { useMemo, useState } from "react";
import { BookOpen, Check, CircleAlert, Clock3, Download, FileText, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnedEbooks } from "@/hooks/useOwnedEbooks";
import { useEbookStore, type Ebook } from "@/hooks/useEbookStore";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { deleteGeneratedEbook } from "@/lib/ebookRepository";
import { checkEbookQuality } from "@/lib/ebookQuality";
import { generatePDF } from "@/lib/pdfGenerator";
import { recordMetric } from "@/lib/productTracking";

export default function ProjectsPage() {
  const { ebooks, loading, error, refresh, user } = useOwnedEbooks();
  const removeEbook = useEbookStore((state) => state.removeEbook);
  const { hasPaidSubscription, subscription } = useSubscription();
  const { toast } = useToast();
  const [reviewing, setReviewing] = useState<Ebook | null>(null);
  const [deleting, setDeleting] = useState<Ebook | null>(null);
  const isExpired = subscription?.status === "expired";
  const canExport = hasPaidSubscription && !isExpired;
  const sortedEbooks = useMemo(() => [...ebooks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [ebooks]);

  const exportEbook = async (ebook: Ebook) => {
    if (!canExport) {
      toast({ title: "Upgrade required", description: isExpired ? "Renew your subscription to export PDFs." : "PDF export remains available on paid plans.", variant: "destructive" });
      return;
    }
    await generatePDF(ebook);
    if (ebook.dbProductId) void recordMetric(ebook.dbProductId, "download");
  };

  const confirmDelete = async () => {
    if (!deleting || !user?.id) return;
    try {
      await deleteGeneratedEbook(deleting.id, user.id);
      removeEbook(deleting.id);
      setDeleting(null);
      if (reviewing?.id === deleting.id) setReviewing(null);
      toast({ title: "Project deleted", description: "The saved product and its versions were removed from your workspace." });
      await refresh();
    } catch (reason) {
      toast({ title: "Could not delete project", description: reason instanceof Error ? reason.message : "Try again.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <main className="min-h-full bg-[#0A0A0A] px-4 py-7 text-white sm:px-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-[#8B8B8B]">Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#969696]">Review generated digital products, run a quick pre-export check, and manage the files saved to your account.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/5"><Link to="/dashboard/analytics/products">Product analytics</Link></Button>
              <Button asChild className="bg-[#F0F2F5] text-[#080A0C] hover:bg-white"><Link to="/dashboard"><Plus size={15} className="mr-2" />New project</Link></Button>
            </div>
          </header>

          {error && <p role="alert" className="rounded-lg border border-[#6B3F3F] bg-[#281919] px-4 py-3 text-sm text-[#E7BABA]">Could not refresh saved projects: {error}</p>}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-48 bg-white/5" /><Skeleton className="h-48 bg-white/5" /><Skeleton className="h-48 bg-white/5" /></div>
          ) : sortedEbooks.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-[#111] px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"><BookOpen size={21} className="text-[#8FA7C0]" /></div>
              <h2 className="text-lg font-medium">No projects yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8A8A8A]">Create an ebook in Product Studio. It will be saved here under your account, ready for review and export.</p>
              <Button asChild className="mt-5 bg-[#F0F2F5] text-[#080A0C] hover:bg-white"><Link to="/dashboard">Create your first ebook</Link></Button>
            </section>
          ) : (
            <section aria-label="Your digital product projects" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedEbooks.map((ebook) => {
                const checks = checkEbookQuality(ebook);
                const passedCount = checks.filter((check) => check.passed).length;
                const ready = passedCount === checks.length;
                return (
                  <article key={ebook.id} className="flex min-h-[205px] flex-col rounded-2xl border border-white/10 bg-[#151515] p-4 transition hover:border-white/20">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#1D1D1D]"><FileText size={17} className="text-[#9EB4C9]" /></div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-medium text-white">{ebook.title}</h2>
                        <p className="mt-1 truncate text-xs text-[#858585]">{ebook.topic}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#777]">
                      <span className="inline-flex items-center gap-1"><Clock3 size={12} />{format(new Date(ebook.createdAt), "MMM d, yyyy")}</span>
                      <span>{ebook.pages} estimated pages</span>
                    </div>
                    <div className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${ready ? "border-emerald-900/70 bg-emerald-950/30 text-emerald-300" : "border-amber-900/70 bg-amber-950/20 text-amber-200"}`}>
                      {ready ? <Check size={12} /> : <CircleAlert size={12} />}
                      {ready ? "Checks passed" : `${passedCount}/${checks.length} checks passed`}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <Button variant="outline" size="sm" className="border-white/15 bg-transparent text-white hover:bg-white/5" onClick={() => setReviewing(ebook)}>Review</Button>
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="bg-[#F0F2F5] text-[#080A0C] hover:bg-white" onClick={() => void exportEbook(ebook)}><Download size={14} className="mr-1.5" />Export</Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${ebook.title}`} className="h-8 w-8 text-[#A0A0A0] hover:bg-red-950/30 hover:text-red-300" onClick={() => setDeleting(ebook)}><Trash2 size={15} /></Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
          <p className="text-xs text-[#676767]">Projects and manuscripts are private to your signed-in account. Previewing and deletion are available here; PDF export follows your existing plan access.</p>
        </div>

        <Dialog open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)}>
          <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto border-white/10 bg-[#151515] text-white">
            <DialogHeader><DialogTitle>{reviewing?.title}</DialogTitle></DialogHeader>
            {reviewing && (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-[#101010] p-4">
                  <h3 className="text-xs font-medium text-[#BEBEBE]">Pre-export review</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {checkEbookQuality(reviewing).map((check) => (
                      <li key={check.id} className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                        {check.passed ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-300" /> : <CircleAlert size={14} className="mt-0.5 shrink-0 text-amber-300" />}
                        <span><span className="block text-xs text-white">{check.label}</span><span className="mt-1 block text-[11px] text-[#888]">{check.detail}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
                <section className="rounded-xl border border-white/10 bg-[#101010] p-4">
                  <h3 className="mb-3 text-xs font-medium text-[#BEBEBE]">Manuscript preview</h3>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#D1D1D1]">{reviewing.content}</pre>
                </section>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" className="border-white/15 bg-transparent text-white" onClick={() => setReviewing(null)}>Close review</Button>
                  <Button className="bg-[#F0F2F5] text-[#080A0C] hover:bg-white" onClick={() => void exportEbook(reviewing)}><Download size={14} className="mr-2" />Download PDF</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent className="border-white/10 bg-[#171717] text-white">
            <AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription className="text-[#9A9A9A]">“{deleting?.title}” and its saved versions will be removed from your account. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/5">Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>Delete project</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </DashboardLayout>
  );
}
