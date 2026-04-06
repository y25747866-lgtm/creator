import { motion } from "framer-motion";
import { BookOpen, Eye, Download, BarChart3, Zap, Search, MoreVertical, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
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

const StatCard = ({ icon: Icon, label, value, trend, loading }: { icon: any; label: string; value: string; trend?: "up" | "down" | "neutral"; loading?: boolean }) => (
  <div
    style={{
      background: "#0F0F0F",
      border: "1px solid #252525",
      borderRadius: "12px",
      padding: "24px",
      minHeight: "130px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      transition: "all 0.3s ease"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "#333333";
      e.currentTarget.style.background = "#121212";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "#252525";
      e.currentTarget.style.background = "#0F0F0F";
    }}
  >
    <div
      style={{
        width: "40px",
        height: "40px",
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#777777",
          marginBottom: "12px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "32px",
          fontWeight: 800,
          color: "#FFFFFF",
          lineHeight: "1",
          marginBottom: trend ? "12px" : "0",
          letterSpacing: "-0.5px",
        }}
      >
        {loading ? "..." : value}
      </div>
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          <TrendIcon trend={trend} />
          <span style={{ color: trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#777777" }}>
            {trend === "up" ? "Growing" : trend === "down" ? "Declining" : "Stable"}
          </span>
        </div>
      )}
    </div>
  </div>
);

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

    let totalRecentDownloads = 0;
    let totalPreviousDownloads = 0;
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

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

      // Aggregate raw download counts for trend calculation
      const recent = metrics
        .filter((m) => (m.metric_type === "download" || m.metric_type === "cover_download") && new Date(m.recorded_at).getTime() > now - weekMs)
        .reduce((s, m) => s + m.value, 0);
      const previous = metrics
        .filter(
          (m) =>
            (m.metric_type === "download" || m.metric_type === "cover_download") &&
            new Date(m.recorded_at).getTime() > now - 2 * weekMs &&
            new Date(m.recorded_at).getTime() <= now - weekMs
        )
        .reduce((s, m) => s + m.value, 0);
      
      totalRecentDownloads += recent;
      totalPreviousDownloads += previous;
    });

    trend = totalRecentDownloads > totalPreviousDownloads ? "up" : totalRecentDownloads < totalPreviousDownloads ? "down" : "neutral";

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

  return (
    <DashboardLayout>
      <div style={{ background: '#0A0A0A', padding: '0' }} className="w-full relative">
        <div style={{ padding: '48px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                Dashboard
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#777777', fontWeight: 400 }}>
                Your digital product command center. Start creating today.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0F0F0F', border: '1px solid #252525', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
                <Zap className="w-4 h-4" />
                AI Credits: {aggregatedStats.aiCredits}
              </div>
              <Button style={{ background: '#FFFFFF', color: '#0A0A0A', fontFamily: "'Syne', sans-serif", fontWeight: 700, borderRadius: '8px', padding: '10px 20px' }}>
                Export
              </Button>
            </div>
          </div>

          {isExpired && (
            <div style={{ padding: '16px', borderRadius: '12px', background: '#1A1A1A', border: '1px solid #252525', display: 'flex', alignItems: 'center', gap: '12px', color: '#FFFFFF', marginBottom: '24px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 500 }}>
              <p>Your subscription has expired. Some premium features are locked.</p>
            </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <StatCard icon={BookOpen} label="Ebooks Created" value={aggregatedStats.ebooksCreated.toLocaleString()} loading={loading} />
            <StatCard icon={Eye} label="Total Views" value={aggregatedStats.totalViews.toLocaleString()} loading={loading} />
            <StatCard icon={Download} label="Total Downloads" value={aggregatedStats.totalDownloads.toLocaleString()} trend={aggregatedStats.trend} loading={loading} />
            <StatCard icon={BarChart3} label="Conversion Rate" value={aggregatedStats.totalViews > 0 ? `${((aggregatedStats.totalDownloads / aggregatedStats.totalViews) * 100).toFixed(1)}%` : "0%"} loading={loading} />
          </div>

          {/* Charts Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '32px' }}>
            {/* Performance Chart */}
            <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Performance</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#777777', marginTop: '6px', fontWeight: 400 }}>Downloads and views over time</p>
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
                      <defs>
                        <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#555555', fontFamily: "'DM Sans', sans-serif"}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#555555', fontFamily: "'DM Sans', sans-serif"}} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F0F0F",
                          border: "1px solid #252525",
                          borderRadius: 8,
                          color: "#FFFFFF",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "13px"
                        }}
                      />
                      <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }} />
                      <Line type="monotone" dataKey="downloads" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="views" stroke="#777777" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Most Day Active */}
            <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Most Day Active</h3>
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#555555', fontFamily: "'DM Sans', sans-serif"}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#555555', fontFamily: "'DM Sans', sans-serif"}} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F0F0F",
                          border: "1px solid #252525",
                          borderRadius: 8,
                          color: "#FFFFFF",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "13px"
                        }}
                      />
                      <Bar dataKey="active" fill="#FFFFFF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            {/* Best Selling Products */}
            <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Best Selling Products</h3>
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
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#777777', textAlign: 'center', padding: '32px 0', fontWeight: 400 }}>
                  No products yet. Create your first ebook to get started!
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product, index) => (
                    <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', background: '#0A0A0A', border: '1px solid #252525', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.background = '#121212'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.background = '#0A0A0A'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#0A0A0A', fontSize: '14px' }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#777777', marginTop: '4px', fontWeight: 400 }}>{product.downloads} downloads</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>${(product.revenue / 100).toFixed(0)}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#777777', marginTop: '4px', fontWeight: 400 }}>★ {product.rating.toFixed(1)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Repeat Rate */}
            <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Repeat Rate</h3>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              {loading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <div style={{ width: '120px', height: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Repeat", value: 65 },
                            { name: "New", value: 35 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#FFFFFF" />
                          <Cell fill="#333333" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>65%</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#777777', marginTop: '6px', fontWeight: 400 }}>Repeat customers</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
