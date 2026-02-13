import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/dashboard/EmptyState";
import ProductTable from "@/components/dashboard/ProductTable";
import ProductMetricsCards from "@/components/dashboard/ProductMetricsCards";
import VersionComparison from "@/components/dashboard/VersionComparison";
import FeedbackInsights from "@/components/dashboard/FeedbackInsights";
import PerformanceTimeline from "@/components/dashboard/PerformanceTimeline";
import { listProducts, getProductMetrics, getProductFeedback, getProductVersions } from "@/lib/productTracking";
import {
  aggregateMetrics,
  type ProductRecord,
  type MetricRecord,
  type FeedbackRecord,
  type VersionRecord,
  type AggregatedMetrics,
} from "@/lib/dashboardMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeOverlay from "@/components/UpgradeOverlay";

const ProductsDashboard = () => {
  const { hasActiveSubscription } = useSubscription();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Per-product caches
  const [metricsCache, setMetricsCache] = useState<Record<string, MetricRecord[]>>({});
  const [feedbackCache, setFeedbackCache] = useState<Record<string, FeedbackRecord[]>>({});
  const [versionsCache, setVersionsCache] = useState<Record<string, VersionRecord[]>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    listProducts()
      .then((data) => {
        const list: ProductRecord[] = data.products ?? data ?? [];
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const fetchDetails = useCallback(
    async (id: string) => {
      if (metricsCache[id]) return; // already cached
      setDetailLoading(true);
      try {
        const [mRes, fRes, vRes] = await Promise.all([
          getProductMetrics(id),
          getProductFeedback(id),
          getProductVersions(id),
        ]);
        setMetricsCache((c) => ({ ...c, [id]: mRes.metrics ?? mRes ?? [] }));
        setFeedbackCache((c) => ({ ...c, [id]: fRes.feedback ?? fRes ?? [] }));
        setVersionsCache((c) => ({ ...c, [id]: vRes.versions ?? vRes ?? [] }));
      } catch {
        setMetricsCache((c) => ({ ...c, [id]: [] }));
        setFeedbackCache((c) => ({ ...c, [id]: [] }));
        setVersionsCache((c) => ({ ...c, [id]: [] }));
      } finally {
        setDetailLoading(false);
      }
    },
    [metricsCache]
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      fetchDetails(id);
    },
    [fetchDetails]
  );

  // Build table data with stats
  const tableProducts = useMemo(() => {
    return products.map((p) => {
      const m = metricsCache[p.id] ?? [];
      const f = feedbackCache[p.id] ?? [];
      const agg = aggregateMetrics(m, f);
      return { ...p, views: agg.totalViews, downloads: agg.totalDownloads, conversionRate: agg.conversionRate, avgRating: agg.avgRating };
    });
  }, [products, metricsCache, feedbackCache]);

  const selectedMetrics: MetricRecord[] = selectedId ? metricsCache[selectedId] ?? [] : [];
  const selectedFeedback: FeedbackRecord[] = selectedId ? feedbackCache[selectedId] ?? [] : [];
  const selectedVersions: VersionRecord[] = selectedId ? versionsCache[selectedId] ?? [] : [];
  const selectedAgg: AggregatedMetrics | null = selectedId ? aggregateMetrics(selectedMetrics, selectedFeedback) : null;
  const selectedProduct = products.find((p) => p.id === selectedId);

  return (
    <DashboardLayout>
      <div className="relative">
        {!hasActiveSubscription && (
          <UpgradeOverlay message="Analytics is available in view-only mode on the free plan. Upgrade to interact with your data, track performance, and export insights." />
        )}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Product Analytics</h1>
          </div>
          <p className="text-muted-foreground">Track performance, compare versions, and understand feedback.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ProductTable products={tableProducts} loading={false} onSelect={handleSelect} selectedId={selectedId} />

            {selectedId && selectedProduct && (
              <motion.div key={selectedId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h2 className="text-lg font-semibold">{selectedProduct.title}</h2>

                <ProductMetricsCards metrics={selectedAgg} loading={detailLoading} />

                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="timeline">Performance</TabsTrigger>
                    <TabsTrigger value="versions">Versions</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  </TabsList>

                  <TabsContent value="timeline">
                    <Card className="p-6">
                      <PerformanceTimeline metrics={selectedMetrics} loading={detailLoading} />
                    </Card>
                  </TabsContent>

                  <TabsContent value="versions">
                    <Card className="p-6">
                      <VersionComparison versions={selectedVersions} metrics={selectedMetrics} loading={detailLoading} />
                    </Card>
                  </TabsContent>

                  <TabsContent value="feedback">
                    <Card className="p-6">
                      <FeedbackInsights feedback={selectedFeedback} loading={detailLoading} />
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ProductsDashboard;
