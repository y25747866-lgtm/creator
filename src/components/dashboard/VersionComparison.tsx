import { useMemo } from "react";
import { Clock, FileText, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VersionRecord, MetricRecord } from "@/lib/dashboardMetrics";
import { rankVersions } from "@/lib/dashboardMetrics";

interface Props {
  versions: VersionRecord[];
  metrics: MetricRecord[];
  loading: boolean;
}

const VersionComparison = ({ versions, metrics, loading }: Props) => {
  const ranked = useMemo(() => rankVersions(versions, metrics), [versions, metrics]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No version history available.</p>;
  }

  const bestId = ranked[0]?.id;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Version History</h3>
      <div className="relative pl-6 border-l-2 border-border space-y-4">
        {versions
          .sort((a, b) => b.version_number - a.version_number)
          .map((v) => {
            const dl = ranked.find((r) => r.id === v.id)?.downloads ?? 0;
            const isBest = v.id === bestId && versions.length > 1;
            return (
              <div key={v.id} className="relative">
                <div className="absolute -left-[calc(0.75rem+1.5px)] top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <Card className={`p-4 ${isBest ? "border-primary/40" : ""}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">v{v.version_number}</span>
                        {isBest && <Badge className="text-[10px] px-1.5 py-0">Best</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(v.created_at).toLocaleDateString()}</span>
                        <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{v.pages} pages</span>
                        <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" />{dl} downloads</span>
                      </div>
                      {v.change_summary && <p className="text-xs text-muted-foreground mt-1">{v.change_summary}</p>}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default VersionComparison;
