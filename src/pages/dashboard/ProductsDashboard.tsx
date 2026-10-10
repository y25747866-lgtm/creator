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
import { listProductsPage, getProductMetrics, getProductFeedback, getProductVersions } from "@/lib/productTracking";
import type { KeysetCursor } from "@/lib/keysetPagination";
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

type DetailKind = "metrics" | "feedback" | "versions";
interface PageState { cursor: KeysetCursor | null; hasMore: boolean }
interface ProductDetailPages { metrics: PageState; feedback: PageState; versions: PageState }
const EMPTY_PAGE: PageState = { cursor: null, hasMore: false };

const ProductsDashboard = () => {
  const { hasActiveSubscription } = useSubscription();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [productCursor, setProductCursor] = useState<KeysetCursor | null>(null);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

  // Per-product caches
  const [metricsCache, setMetricsCache] = useState<Record<string, MetricRecord[]>>({});
  const [feedbackCache, setFeedbackCache] = useState<Record<string, FeedbackRecord[]>>({});
  const [versionsCache, setVersionsCache] = useState<Record<string, VersionRecord[]>>({});
  const [detailPages, setDetailPages] = useState<Record<string, ProductDetailPages>>({});
  const [loadingMoreKind, setLoadingMoreKind] = useState<DetailKind | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const page = await listProductsPage();
        setProducts(page.items as ProductRecord[]);
        setProductCursor(page.nextCursor);
        setHasMoreProducts(page.hasMore);
      } catch (error) {
        console.error("Failed to load products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const loadMoreProducts = useCallback(async () => {
    if (!productCursor || !hasMoreProducts || loadingMoreProducts) return;
    setLoadingMoreProducts(true);
    try {
      const page = await listProductsPage(productCursor);
      const nextProducts = page.items as ProductRecord[];
      setProducts((current) => {
        const ids = new Set(current.map((product) => product.id));
        return [...current, ...nextProducts.filter((product) => !ids.has(product.id))];
      });
      setProductCursor(page.nextCursor);
      setHasMoreProducts(page.hasMore);
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoadingMoreProducts(false);
    }
  }, [productCursor, hasMoreProducts, loadingMoreProducts]);

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
        
        // Ensure metrics is an array
        let metrics: MetricRecord[] = [];
        if (Array.isArray(mRes)) {
          metrics = mRes;
        } else if (mRes?.metrics && Array.isArray(mRes.metrics)) {
          metrics = mRes.metrics;
        }

        // Ensure feedback is an array
        let feedback: FeedbackRecord[] = [];
        if (Array.isArray(fRes)) {
          feedback = fRes;
        } else if (fRes?.feedback && Array.isArray(fRes.feedback)) {
          feedback = fRes.feedback;
        }

        // Ensure versions is an array
        let versions: VersionRecord[] = [];
        if (Array.isArray(vRes)) {
          versions = vRes;
        } else if (vRes?.versions && Array.isArray(vRes.versions)) {
          versions = vRes.versions;
        }

        const pageFeedback = Array.isArray(fRes?.items) ? fRes.items as FeedbackRecord[] : feedback;
        const pageVersions = Array.isArray(vRes?.items) ? vRes.items as VersionRecord[] : versions;
        setMetricsCache((c) => ({ ...c, [id]: metrics }));
        setFeedbackCache((c) => ({ ...c, [id]: pageFeedback }));
        setVersionsCache((c) => ({ ...c, [id]: pageVersions }));
        setDetailPages((c) => ({
          ...c,
          [id]: {
            metrics: { cursor: mRes?.nextCursor ?? null, hasMore: Boolean(mRes?.hasMore) },
            feedback: { cursor: fRes?.nextCursor ?? null, hasMore: Boolean(fRes?.hasMore) },
            versions: { cursor: vRes?.nextCursor ?? null, hasMore: Boolean(vRes?.hasMore) },
          },
        }));
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

  const loadMoreDetails = useCallback(async (kind: DetailKind) => {
    if (!selectedId || loadingMoreKind) return;
    const id = selectedId;
    const pages = detailPages[id] ?? { metrics: EMPTY_PAGE, feedback: EMPTY_PAGE, versions: EMPTY_PAGE };
    const page = pages[kind];
    if (!page.hasMore || !page.cursor) return;
    setLoadingMoreKind(kind);
    try {
      if (kind === "metrics") {
        const response = await getProductMetrics(id, page.cursor);
        const rows = Array.isArray(response?.metrics) ? response.metrics as MetricRecord[] : [];
        setMetricsCache((current) => ({ ...current, [id]: [...(current[id] ?? []), ...rows] }));
        setDetailPages((current) => ({ ...current, [id]: { ...(current[id] ?? pages), metrics: { cursor: response?.nextCursor ?? null, hasMore: Boolean(response?.hasMore) } } }));
      } else if (kind === "feedback") {
        const response = await getProductFeedback(id, page.cursor);
        const rows = Array.isArray(response?.items) ? response.items as FeedbackRecord[] : [];
        setFeedbackCache((current) => ({ ...current, [id]: [...(current[id] ?? []), ...rows] }));
        setDetailPages((current) => ({ ...current, [id]: { ...(current[id] ?? pages), feedback: { cursor: response?.nextCursor ?? null, hasMore: Boolean(response?.hasMore) } } }));
      } else {
        const response = await getProductVersions(id, page.cursor);
        const rows = Array.isArray(response?.items) ? response.items as VersionRecord[] : [];
        setVersionsCache((current) => ({ ...current, [id]: [...(current[id] ?? []), ...rows] }));
        setDetailPages((current) => ({ ...current, [id]: { ...(current[id] ?? pages), versions: { cursor: response?.nextCursor ?? null, hasMore: Boolean(response?.hasMore) } } }));
      }
    } catch (error) {
      console.error(`Failed to load more ${kind}:`, error);
    } finally {
      setLoadingMoreKind(null);
    }
  }, [selectedId, detailPages, loadingMoreKind]);

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
            <ProductTable products={tableProducts} loading={false} onSelect={handleSelect} selectedId={selectedId} hasMoreProducts={hasMoreProducts} loadingMore={loadingMoreProducts} onLoadMore={loadMoreProducts} />

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
                      <PerformanceTimeline metrics={selectedMetrics} loading={detailLoading} hasMore={Boolean(detailPages[selectedId]?.metrics.hasMore)} loadingMore={loadingMoreKind === "metrics"} onLoadMore={() => loadMoreDetails("metrics")} />
                    </Card>
                  </TabsContent>

                  <TabsContent value="versions">
                    <Card className="p-6">
                      <VersionComparison versions={selectedVersions} metrics={selectedMetrics} loading={detailLoading} hasMore={Boolean(detailPages[selectedId]?.versions.hasMore)} loadingMore={loadingMoreKind === "versions"} onLoadMore={() => loadMoreDetails("versions")} />
                    </Card>
                  </TabsContent>

                  <TabsContent value="feedback">
                    <Card className="p-6">
                      <FeedbackInsights feedback={selectedFeedback} loading={detailLoading} hasMore={Boolean(detailPages[selectedId]?.feedback.hasMore)} loadingMore={loadingMoreKind === "feedback"} onLoadMore={() => loadMoreDetails("feedback")} />
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
