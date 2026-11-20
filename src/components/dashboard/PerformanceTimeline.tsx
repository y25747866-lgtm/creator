import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { MetricRecord } from "@/lib/dashboardMetrics";
import { buildTimeline } from "@/lib/dashboardMetrics";

interface Props {
  metrics: MetricRecord[];
  loading: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const PerformanceTimeline = ({ metrics, loading, hasMore = false, loadingMore = false, onLoadMore }: Props) => {
  const data = useMemo(() => buildTimeline(metrics), [metrics]);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No performance data yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#viewsGrad)" strokeWidth={2} name="Views" />
          <Area type="monotone" dataKey="downloads" stroke="hsl(var(--accent))" fill="url(#dlGrad)" strokeWidth={2} name="Downloads" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading metrics…" : "Load more metrics"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PerformanceTimeline;
