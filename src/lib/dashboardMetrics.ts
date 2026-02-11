// Pure data logic — no UI components

export interface MetricRecord {
  id: string;
  product_id: string;
  metric_type: string;
  value: number;
  recorded_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface FeedbackRecord {
  id: string;
  product_id: string;
  user_id: string;
  rating: number | null;
  comment: string | null;
  section_reference: string | null;
  feedback_type: string;
  created_at: string;
}

export interface VersionRecord {
  id: string;
  product_id: string;
  version_number: number;
  content: string;
  cover_image_url: string | null;
  pages: number;
  change_summary: string | null;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  status: string;
  length: string;
  created_at: string;
  updated_at: string;
}

export interface AggregatedMetrics {
  totalViews: number;
  totalDownloads: number;
  conversionRate: number;
  avgRating: number;
  ratingCount: number;
  trend: "up" | "down" | "neutral";
}

export function aggregateMetrics(metrics: MetricRecord[], feedback: FeedbackRecord[]): AggregatedMetrics {
  const totalViews = metrics.filter((m) => m.metric_type === "view").reduce((s, m) => s + m.value, 0);
  const totalDownloads = metrics
    .filter((m) => m.metric_type === "download" || m.metric_type === "cover_download")
    .reduce((s, m) => s + m.value, 0);
  const conversionRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;

  const ratings = feedback.filter((f) => f.rating !== null).map((f) => f.rating as number);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

  // Trend: compare last 7 days vs previous 7 days downloads
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recentDownloads = metrics.filter(
    (m) => (m.metric_type === "download" || m.metric_type === "cover_download") && new Date(m.recorded_at).getTime() > now - weekMs
  ).length;
  const previousDownloads = metrics.filter(
    (m) =>
      (m.metric_type === "download" || m.metric_type === "cover_download") &&
      new Date(m.recorded_at).getTime() > now - 2 * weekMs &&
      new Date(m.recorded_at).getTime() <= now - weekMs
  ).length;

  const trend: "up" | "down" | "neutral" =
    recentDownloads > previousDownloads ? "up" : recentDownloads < previousDownloads ? "down" : "neutral";

  return { totalViews, totalDownloads, conversionRate, avgRating, ratingCount: ratings.length, trend };
}

export function rankVersions(versions: VersionRecord[], metrics: MetricRecord[]): (VersionRecord & { downloads: number })[] {
  return versions
    .map((v) => {
      const downloads = metrics
        .filter((m) => m.metric_type === "download" && new Date(m.recorded_at) >= new Date(v.created_at))
        .reduce((s, m) => s + m.value, 0);
      return { ...v, downloads };
    })
    .sort((a, b) => b.downloads - a.downloads);
}

export interface TimelinePoint {
  date: string;
  views: number;
  downloads: number;
  conversion: number;
}

export function buildTimeline(metrics: MetricRecord[]): TimelinePoint[] {
  const buckets: Record<string, { views: number; downloads: number }> = {};

  for (const m of metrics) {
    const date = m.recorded_at.slice(0, 10);
    if (!buckets[date]) buckets[date] = { views: 0, downloads: 0 };
    if (m.metric_type === "view") buckets[date].views += m.value;
    if (m.metric_type === "download" || m.metric_type === "cover_download") buckets[date].downloads += m.value;
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      views: d.views,
      downloads: d.downloads,
      conversion: d.views > 0 ? Math.round((d.downloads / d.views) * 100) : 0,
    }));
}

export function extractKeywords(feedback: FeedbackRecord[]): { word: string; count: number }[] {
  const stopWords = new Set(["the", "a", "an", "is", "it", "to", "and", "of", "in", "for", "on", "was", "i", "this", "that", "but", "with"]);
  const wordMap: Record<string, number> = {};

  for (const f of feedback) {
    if (!f.comment) continue;
    const words = f.comment.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w)) {
        wordMap[w] = (wordMap[w] || 0) + 1;
      }
    }
  }

  return Object.entries(wordMap)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export function sectionInsights(feedback: FeedbackRecord[]): { section: string; avgRating: number; count: number }[] {
  const sections: Record<string, { total: number; count: number }> = {};

  for (const f of feedback) {
    if (!f.section_reference || f.rating === null) continue;
    if (!sections[f.section_reference]) sections[f.section_reference] = { total: 0, count: 0 };
    sections[f.section_reference].total += f.rating;
    sections[f.section_reference].count += 1;
  }

  return Object.entries(sections)
    .map(([section, d]) => ({ section, avgRating: d.total / d.count, count: d.count }))
    .sort((a, b) => a.avgRating - b.avgRating);
}
