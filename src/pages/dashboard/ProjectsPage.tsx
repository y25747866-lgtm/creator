import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
  BookOpen,
  Check,
  CircleAlert,
  Download,
  FileText,
  Filter,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import DashboardLayout, { useDashboardAccess } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnedEbooks } from "@/hooks/useOwnedEbooks";
import { useEbookStore, type Ebook } from "@/hooks/useEbookStore";
import { useToast } from "@/hooks/use-toast";
import { deleteGeneratedEbook, renameGeneratedEbook } from "@/lib/ebookRepository";
import { checkEbookQuality } from "@/lib/ebookQuality";
import { generatePDF } from "@/lib/pdfGenerator";
import { recordMetric } from "@/lib/productTracking";

type ProductFilter = "All products" | "Ready to download" | "Needs review";

function relativeDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "saved recently" : formatDistanceToNowStrict(date, { addSuffix: true });
}

export default function ProjectsPage() {
  const { ebooks, loading, error, refresh, user } = useOwnedEbooks();
  const updateEbook = useEbookStore((state) => state.updateEbook);
  const removeEbook = useEbookStore((state) => state.removeEbook);
  const access = useDashboardAccess();
  const { toast } = useToast();
  const [reviewing, setReviewing] = useState<Ebook | null>(null);
  const [deleting, setDeleting] = useState<Ebook | null>(null);
  const [renaming, setRenaming] = useState<Ebook | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("All products");
  const canExport = access.hasPaidSubscription;

  const filteredEbooks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return ebooks.filter((ebook) => {
      const matchesQuery = !query || `${ebook.title} ${ebook.topic}`.toLocaleLowerCase().includes(query);
      const checks = checkEbookQuality(ebook);
      const ready = checks.every((check) => check.passed);
      const matchesFilter = filter === "All products" || (filter === "Ready to download" ? ready : !ready);
      return matchesQuery && matchesFilter;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ebooks, filter, searchQuery]);

  const exportEbook = async (ebook: Ebook) => {
    if (!canExport) {
      toast({ title: "Upgrade required", description: access.isExpired ? "Renew your plan to download products." : "Downloads require an active paid plan.", variant: "destructive" });
      return;
    }
    try {
      await generatePDF(ebook);
      if (ebook.dbProductId) void recordMetric(ebook.dbProductId, "download");
    } catch (reason) {
      toast({ title: "Download failed", description: reason instanceof Error ? reason.message : "Try again.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !user?.id) return;
    try {
      await deleteGeneratedEbook(deleting.id, user.id);
      removeEbook(deleting.id);
      setDeleting(null);
      if (reviewing?.id === deleting.id) setReviewing(null);
      toast({ title: "Product deleted", description: "The saved product and its versions were removed from your workspace." });
      await refresh();
    } catch (reason) {
      toast({ title: "Could not delete product", description: reason instanceof Error ? reason.message : "Try again.", variant: "destructive" });
    }
  };

  const openRename = (ebook: Ebook) => {
    setRenameTitle(ebook.title);
    setRenaming(ebook);
  };

  const saveRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = renameTitle.trim();
    if (!renaming || !user?.id || !title) return;
    setSavingRename(true);
    try {
      await renameGeneratedEbook(renaming.id, user.id, title);
      updateEbook(renaming.id, { title });
      setRenaming(null);
      toast({ title: "Product renamed", description: `Name updated to “${title}”.` });
      await refresh();
    } catch (reason) {
      toast({ title: "Could not rename product", description: reason instanceof Error ? reason.message : "Try again.", variant: "destructive" });
    } finally {
      setSavingRename(false);
    }
  };

  const isEmpty = ebooks.length === 0;
  const hasSearchOrFilter = Boolean(searchQuery.trim()) || filter !== "All products";

  return (
    <DashboardLayout>
      <main className="min-h-full bg-[#080A0C] px-4 pb-28 pt-6 text-white sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/45">Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">My Products</h1>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#111318] px-3 text-white/50 sm:w-72 sm:flex-none">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products"
                  aria-label="Search products"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
                {searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="rounded p-1 text-white/45 hover:text-white"><X size={14} /></button>}
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="Filter products" title={filter} className="h-10 w-10 shrink-0 border-white/10 bg-[#111318] text-white/70 hover:bg-[#1A1D24] hover:text-white"><Filter size={16} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-white/10 bg-[#111318] text-white">
                  {(["All products", "Ready to download", "Needs review"] as ProductFilter[]).map((option) => (
                    <DropdownMenuItem key={option} onSelect={() => setFilter(option)} className={filter === option ? "bg-white/[0.08] text-white" : "text-white/70"}>{option}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {!canExport && <p className="rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-xs leading-5 text-white/65">Your saved products stay visible here. PDF downloads require an active paid plan. <Link to="/pricing" className="text-white underline underline-offset-2">View plans</Link></p>}
          {error && <p role="alert" className="rounded-lg border border-white/10 bg-[#111318] px-4 py-3 text-sm text-white/65">Could not refresh saved products: {error}</p>}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-44 bg-white/[0.05]" /><Skeleton className="h-44 bg-white/[0.05]" /><Skeleton className="h-44 bg-white/[0.05]" /></div>
          ) : isEmpty ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-[#111318] px-5 py-14 text-center">
              <FolderOpen size={22} className="mx-auto text-white/45" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-medium">Your products will appear here</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/50">Start by creating your first digital product.</p>
              <Button asChild className="mt-5 bg-white text-[#080A0C] hover:bg-white/90"><Link to="/dashboard"><Plus size={15} className="mr-2" />Create Product</Link></Button>
            </section>
          ) : filteredEbooks.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-[#111318] px-5 py-12 text-center">
              <Search size={20} className="mx-auto text-white/40" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-medium">No matching products</h2>
              <p className="mt-1 text-sm text-white/50">Change the search or filter to see more.</p>
              {hasSearchOrFilter && <Button type="button" variant="outline" className="mt-4 border-white/15 bg-transparent text-white hover:bg-white/[0.06]" onClick={() => { setSearchQuery(""); setFilter("All products"); }}>Clear filters</Button>}
            </section>
          ) : (
            <section aria-label="Your digital products" className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEbooks.map((ebook) => {
                const checks = checkEbookQuality(ebook);
                const ready = checks.every((check) => check.passed);
                return (
                  <article key={ebook.id} className="flex min-h-[180px] min-w-0 flex-col rounded-xl border border-[#1E2028] bg-[#111318] p-3 transition-colors hover:border-white/20 sm:min-h-[196px] sm:rounded-2xl sm:p-4">
                    <div className="flex min-w-0 items-start gap-2.5">
                      {ebook.coverImageUrl ? (
                        <img src={ebook.coverImageUrl} alt="" width="40" height="48" className="h-12 w-10 shrink-0 rounded-md border border-white/10 object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]"><FileText size={17} className="text-white/65" aria-hidden="true" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-sm font-medium leading-5 text-white">{ebook.title}</h2>
                        <p className="mt-1 text-[11px] leading-4 text-white/45">Ebook · {relativeDate(ebook.createdAt)}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-4 text-white/45">{ebook.topic}</p>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-3">
                      <Button size="sm" disabled={!canExport} title={canExport ? "Download product" : "Upgrade to download"} className="h-8 min-w-0 bg-white px-2.5 text-xs text-[#080A0C] hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40" onClick={() => void exportEbook(ebook)}>
                        <Download size={13} className="mr-1.5 shrink-0" aria-hidden="true" />Download
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" aria-label={`${ebook.title} options`} className="h-8 w-8 shrink-0 text-white/55 hover:bg-white/[0.06] hover:text-white"><MoreHorizontal size={17} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-white/10 bg-[#111318] text-white">
                          <DropdownMenuItem onSelect={() => setReviewing(ebook)}><BookOpen size={14} className="mr-2" />Review</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openRename(ebook)}><Pencil size={14} className="mr-2" />Rename</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDeleting(ebook)}><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 inline-flex w-fit items-center gap-1.5 text-[10px] text-white/45">
                      {ready ? <Check size={12} aria-hidden="true" /> : <CircleAlert size={12} aria-hidden="true" />}
                      {ready ? "Checks passed" : `${checks.filter((check) => check.passed).length}/${checks.length} checks passed`}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>

        <Button asChild aria-label="New Product" className="fixed bottom-6 right-5 z-30 h-12 rounded-full bg-white px-4 text-sm font-medium text-[#080A0C] hover:bg-white/90">
          <Link to="/dashboard"><Plus size={17} className="mr-2" />New Product</Link>
        </Button>

        <Dialog open={Boolean(renaming)} onOpenChange={(open) => { if (!open && !savingRename) setRenaming(null); }}>
          <DialogContent className="border-white/10 bg-[#111318] text-white">
            <DialogHeader><DialogTitle>Rename product</DialogTitle></DialogHeader>
            <form onSubmit={(event) => void saveRename(event)} className="space-y-4">
              <label htmlFor="rename-product-title" className="block text-xs text-white/65">Product name</label>
              <input id="rename-product-title" value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} maxLength={120} autoFocus className="h-11 w-full rounded-lg border border-white/10 bg-[#080A0C] px-3 text-sm text-white outline-none focus-visible:border-white/40" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={savingRename} className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]" onClick={() => setRenaming(null)}>Cancel</Button>
                <Button type="submit" disabled={savingRename || !renameTitle.trim()} className="bg-white text-[#080A0C] hover:bg-white/90">{savingRename ? "Saving…" : "Save name"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)}>
          <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto border-white/10 bg-[#111318] text-white">
            <DialogHeader><DialogTitle>{reviewing?.title}</DialogTitle></DialogHeader>
            {reviewing && (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-[#080A0C] p-4">
                  <h3 className="text-xs font-medium text-white/70">Pre-download review</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {checkEbookQuality(reviewing).map((check) => (
                      <li key={check.id} className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                        {check.passed ? <Check size={14} className="mt-0.5 shrink-0 text-white/80" /> : <CircleAlert size={14} className="mt-0.5 shrink-0 text-white/45" />}
                        <span><span className="block text-xs text-white">{check.label}</span><span className="mt-1 block text-[11px] text-white/45">{check.detail}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
                <section className="rounded-xl border border-white/10 bg-[#080A0C] p-4">
                  <h3 className="mb-3 text-xs font-medium text-white/70">Manuscript preview</h3>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-white/80">{reviewing.content}</pre>
                </section>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" className="border-white/15 bg-transparent text-white" onClick={() => setReviewing(null)}>Close review</Button>
                  <Button disabled={!canExport} className="bg-white text-[#080A0C] hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40" onClick={() => void exportEbook(reviewing)}><Download size={14} className="mr-2" />Download PDF</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent className="border-white/10 bg-[#111318] text-white">
            <AlertDialogHeader><AlertDialogTitle>Delete this product?</AlertDialogTitle><AlertDialogDescription className="text-white/55">“{deleting?.title}” and its saved versions will be removed from your account. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]">Cancel</AlertDialogCancel><AlertDialogAction className="bg-white text-[#080A0C] hover:bg-white/90" onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>Delete product</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </DashboardLayout>
  );
}
