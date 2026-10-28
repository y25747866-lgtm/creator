import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MonetizationWizard from "@/components/monetization/MonetizationWizard";
import MonetizationProductCard from "@/components/monetization/MonetizationProductCard";
import ModulePreview from "@/components/monetization/ModulePreview";
import { listMonetizationProducts, type MonetizationModule } from "@/lib/monetization";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { KeysetCursor } from "@/lib/keysetPagination";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";

type ViewState =
  | { mode: "list" }
  | { mode: "wizard" }
  | { mode: "preview"; module: MonetizationModule; productTitle: string };

const MonetizationDashboard = () => {
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const { toast } = useToast();

  const { hasPaidSubscription, subscription, loading: subLoading } = useSubscription();
  
  const isExpired = subscription?.status === "expired";
  const hasAccess = hasPaidSubscription && !isExpired;

  const productsQuery = useInfiniteQuery({
    queryKey: ["monetization-products"],
    initialPageParam: null as KeysetCursor | null,
    queryFn: ({ pageParam }) => listMonetizationProducts(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: hasAccess,
  });
  const products = productsQuery.data?.pages.flatMap((page) => page.products) ?? [];
  const isLoading = productsQuery.isLoading;
  const refetch = productsQuery.refetch;

  const handleWizardComplete = useCallback(() => {
    setView({ mode: "list" });
    refetch();
    toast({ title: "Assets Generated", description: "Your monetization assets are ready." });
  }, [refetch, toast]);

  const handleModuleClick = useCallback((mod: MonetizationModule, productTitle: string) => {
    setView({ mode: "preview", module: mod, productTitle });
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 relative">
        {/* HARD UI LOCK FOR EXPIRED/FREE USERS */}
        {!hasAccess && !subLoading && (
          <UpgradeOverlay message={isExpired ? "Your subscription has expired. Please renew to continue using the Monetization Engine." : "The Monetization Engine is a premium feature. Upgrade to start building your digital product ecosystem."} />
        )}

        <div className={!hasAccess && !subLoading ? "opacity-50 pointer-events-none" : ""}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              {view.mode !== "list" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView({ mode: "list" })}
                  className="mb-2 -ml-2 text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <h1 className="text-3xl font-bold tracking-tight">Monetization Engine</h1>
              <p className="text-muted-foreground mt-1">
                Transform one idea into an entire business system.
              </p>
            </div>
            {view.mode === "list" && (
              <Button onClick={() => setView({ mode: "wizard" })} className="gap-2" disabled={!hasAccess}>
                <Package className="w-4 h-4" />
                Create Assets
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {view.mode === "wizard" && (
              <motion.div
                key="wizard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MonetizationWizard
                  onComplete={handleWizardComplete}
                  onCancel={() => setView({ mode: "list" })}
                />
              </motion.div>
            )}

            {view.mode === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ModulePreview
                  module={view.module}
                  productTitle={view.productTitle}
                  onBack={() => { setView({ mode: "list" }); refetch(); }}
                />
              </motion.div>
            )}

            {view.mode === "list" && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                  </div>
                ) : !products || products.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Package className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">No monetization assets yet</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Transform your ebook or idea into courses, lead magnets, email sequences, and more.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setView({ mode: "wizard" })} disabled={!hasAccess}>
                        Create Your First Assets
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/dashboard/ebook-generator">Generate an Ebook First</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {products.map((product) => (
                      <MonetizationProductCard
                        key={product.id}
                        product={product}
                        onModuleClick={(mod) => handleModuleClick(mod, product.title)}
                      />
                    ))}
                    {productsQuery.hasNextPage && (
                      <div className="md:col-span-2 flex justify-center">
                        <Button variant="outline" onClick={() => productsQuery.fetchNextPage()} disabled={productsQuery.isFetchingNextPage}>
                          {productsQuery.isFetchingNextPage ? "Loading campaigns…" : "Load more campaigns"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MonetizationDashboard;
