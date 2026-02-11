import { Eye, Download, BarChart3, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AggregatedMetrics } from "@/lib/dashboardMetrics";

interface Props {
  metrics: AggregatedMetrics | null;
  loading: boolean;
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "neutral" }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-primary" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const cards = [
  { key: "views" as const, label: "Total Views", icon: Eye, getValue: (m: AggregatedMetrics) => m.totalViews.toLocaleString() },
  { key: "downloads" as const, label: "Downloads", icon: Download, getValue: (m: AggregatedMetrics) => m.totalDownloads.toLocaleString() },
  { key: "conversion" as const, label: "Conversion", icon: BarChart3, getValue: (m: AggregatedMetrics) => `${m.conversionRate.toFixed(1)}%` },
  {
    key: "rating" as const,
    label: "Avg Rating",
    icon: Star,
    getValue: (m: AggregatedMetrics) => (m.ratingCount > 0 ? `${m.avgRating.toFixed(1)} / 5` : "No ratings"),
  },
];

const ProductMetricsCards = ({ metrics, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.key} className="p-5 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{c.label}</span>
            <c.icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">{c.getValue(metrics)}</span>
            {c.key === "downloads" && <TrendIcon trend={metrics.trend} />}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ProductMetricsCards;
