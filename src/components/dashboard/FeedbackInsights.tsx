import { useMemo } from "react";
import { Star, MessageSquare, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedbackRecord } from "@/lib/dashboardMetrics";
import { extractKeywords, sectionInsights } from "@/lib/dashboardMetrics";

interface Props {
  feedback: FeedbackRecord[];
  loading: boolean;
}

const FeedbackInsights = ({ feedback, loading }: Props) => {
  const keywords = useMemo(() => extractKeywords(feedback), [feedback]);
  const sections = useMemo(() => sectionInsights(feedback), [feedback]);
  const avgRating = useMemo(() => {
    const ratings = feedback.filter((f) => f.rating !== null).map((f) => f.rating as number);
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  }, [feedback]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (feedback.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No feedback received yet.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />
          <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">avg ({feedback.filter((f) => f.rating !== null).length} ratings)</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">{feedback.filter((f) => f.comment).length} comments</span>
        </div>
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Common Keywords
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {keywords.slice(0, 10).map((k) => (
              <Badge key={k.word} variant="secondary" className="font-normal text-xs">
                {k.word} ({k.count})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Section insights */}
      {sections.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Section Performance</h4>
          <div className="space-y-2">
            {sections.map((s) => (
              <div key={s.section} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm">{s.section}</span>
                <span className={`text-sm font-medium ${s.avgRating < 3 ? "text-destructive" : "text-primary"}`}>
                  {s.avgRating.toFixed(1)} / 5
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent feedback */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Recent Feedback</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {feedback
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8)
            .map((f) => (
              <Card key={f.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-relaxed">{f.comment || "No comment"}</p>
                  {f.rating !== null && (
                    <span className="text-xs font-medium whitespace-nowrap flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent" />
                      {f.rating}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackInsights;
