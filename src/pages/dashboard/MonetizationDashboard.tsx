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
import {
  listMonetizationProducts,
  MonetizationProduct,
  MonetizationModule,
} from "@/lib/monetization";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

type ViewState =
  | { mode: "list" }
  | { mode: "wizard" }
  | { mode: "preview"; module: MonetizationModule; productTitle: string };

const MonetizationDashboard = () => {
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const { toast } = useToast();

  const {
    data: products,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["monetization-products"],
    queryFn: async () => {
      const res = await listMonetizationProducts();
      return (res.products || []) as MonetizationProduct[];
    },
  });

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
      <div className="max-w-6xl mx-auto space-y-8">
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
            <Button onClick={() => setView({ mode: "wizard" })} className="gap-2">
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
                    <Button onClick={() => setView({ mode: "wizard" })}>
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
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default MonetizationDashboard;
