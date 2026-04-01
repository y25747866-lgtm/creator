import { motion } from "framer-motion";
import { Eye, Download, BarChart3, Zap, Search, MoreVertical, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/hooks/useSubscription";
import { listProducts, getProductMetrics, getProductFeedback } from "@/lib/productTracking";
import { aggregateMetrics, type ProductRecord, type MetricRecord, type FeedbackRecord } from "@/lib/dashboardMetrics";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const TrendIcon = ({ trend }: { trend: "up" | "down" | "neutral" }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const Dashboard = () => {
  const { hasPaidSubscription, subscription } = useSubscription();
  const isExpired = subscription?.status === "expired";
  
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [metricsCache, setMetricsCache] = useState<Record<string, MetricRecord[]>>({});
  const [feedbackCache, setFeedbackCache] = useState<Record<string, FeedbackRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await listProducts();
        const list: ProductRecord[] = data.products ?? data ?? [];
        setProducts(list);
        
        // Load metrics for all products
        if (list.length > 0) {
          const metricsData: Record<string, MetricRecord[]> = {};
          const feedbackData: Record<string, FeedbackRecord[]> = {};
          
          for (const product of list) {
            try {
              const [mRes, fRes] = await Promise.all([
                getProductMetrics(product.id),
                getProductFeedback(product.id),
              ]);
              metricsData[product.id] = mRes.metrics ?? mRes ?? [];
              feedbackData[product.id] = fRes.feedback ?? fRes ?? [];
            } catch (error) {
              metricsData[product.id] = [];
              feedbackData[product.id] = [];
            }
          }
          
          setMetricsCache(metricsData);
          setFeedbackCache(feedbackData);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    let totalEbooks = 0;
    let totalDownloads = 0;
    let totalViews = 0;
    let avgRating = 0;
    let ratingCount = 0;
    let trend: "up" | "down" | "neutral" = "neutral";

    products.forEach((product) => {
      totalEbooks++;
      const metrics = metricsCache[product.id] ?? [];
      const feedback = feedbackCache[product.id] ?? [];
      const agg = aggregateMetrics(metrics, feedback);
      
      totalDownloads += agg.totalDownloads;
      totalViews += agg.totalViews;
      if (agg.avgRating > 0) {
        avgRating += agg.avgRating;
        ratingCount++;
      }
      // Use the trend from the first product with metrics
      if (trend === "neutral" && agg.trend !== "neutral") {
        trend = agg.trend;
      }
    });

    return {
      ebooksCreated: totalEbooks,
      totalDownloads,
      totalViews,
      avgRating: ratingCount > 0 ? (avgRating / ratingCount).toFixed(1) : "0",
      aiCredits: hasPaidSubscription && !isExpired ? "∞" : "1/day",
      trend,
    };
  }, [products, metricsCache, feedbackCache, hasPaidSubscription, isExpired]);

  // Generate chart data
  const chartData = useMemo(() => {
    const data: Array<{
      day: string;
      downloads: number;
      views: number;
      active: number;
    }> = [];

    const days = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      let downloads = 0;
      let views = 0;

      products.forEach((product) => {
        const metrics = metricsCache[product.id] ?? [];
        metrics.forEach((m) => {
          if (m.recorded_at.slice(0, 10) === dateStr) {
            if (m.metric_type === "download" || m.metric_type === "cover_download") {
              downloads += m.value;
            } else if (m.metric_type === "view") {
              views += m.value;
            }
          }
        });
      });

      data.push({
        day: days[6 - i],
        downloads,
        views,
        active: Math.floor(Math.random() * 160),
      });
    }

    return data;
  }, [products, metricsCache]);

  // Get top products
  const topProducts = useMemo(() => {
    return products
      .map((p) => {
        const metrics = metricsCache[p.id] ?? [];
        const feedback = feedbackCache[p.id] ?? [];
        const agg = aggregateMetrics(metrics, feedback);
        return {
          id: p.id,
          name: p.title,
          downloads: agg.totalDownloads,
          revenue: agg.totalDownloads * 29.99,
          rating: agg.avgRating,
        };
      })
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5);
  }, [products, metricsCache, feedbackCache]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return topProducts;
    return topProducts.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [topProducts, searchQuery]);

  const stats = [
    {
      icon: Eye,
      label: "Total Views",
      value: aggregatedStats.totalViews.toLocaleString(),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Download,
      label: "Total Downloads",
      value: aggregatedStats.totalDownloads.toLocaleString(),
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: BarChart3,
      label: "Conversion Rate",
      value: aggregatedStats.totalViews > 0 
        ? `${((aggregatedStats.totalDownloads / aggregatedStats.totalViews) * 100).toFixed(1)}%`
        : "0%",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Zap,
      label: "AI Credits",
      value: aggregatedStats.aiCredits.toString(),
      color: "from-violet-500 to-purple-500",
    },
  ];

  const COLORS = ["#8b5cf6", "#ec4899", "#f97316", "#06b6d4", "#10b981"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Your digital product command center. Start creating today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="gap-2">
              Export
            </Button>
          </div>
        </motion.div>

        {isExpired && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive">
            <p className="text-sm font-medium">Your subscription has expired. Some premium features are locked.</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.label === "Total Downloads" && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <TrendIcon trend={aggregatedStats.trend} />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold">{loading ? "..." : stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Profit / Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Performance</h3>
                  <p className="text-sm text-muted-foreground">Downloads and views over time</p>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="downloads" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="views" stroke="#ec4899" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Most Day Active */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Most Day Active</h3>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="active" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Best Selling Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Best Selling Products</h3>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No products yet. Create your first ebook to get started!
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.downloads} downloads</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${(product.revenue / 100).toFixed(0)}</p>
                        <p className="text-xs text-yellow-600">★ {product.rating.toFixed(1)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Repeat Customer Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Repeat Rate</h3>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="relative w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Repeat", value: 68 },
                            { name: "New", value: 32 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-2xl font-bold mt-4">68%</p>
                  <p className="text-xs text-muted-foreground text-center">On track for 80% target</p>
                  <Button variant="link" size="sm" className="mt-2">
                    Show details
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
