"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetaAdsCampaignChartRow } from "@/modules/meta/lib/meta-ads-chart-types";

const METRICS = [
  { key: "spend" as const, label: "Spend", color: "var(--color-primary)", format: formatMoney },
  { key: "messagingConversations" as const, label: "Messaging", color: "#0ea5e9", format: formatInt },
  { key: "reach" as const, label: "Reach", color: "#8b5cf6", format: formatInt },
  { key: "impressions" as const, label: "Impressions", color: "#f59e0b", format: formatInt },
  { key: "clicks" as const, label: "Clicks", color: "#64748b", format: formatInt },
];

function formatMoney(value: number) {
  return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatInt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function maxForMetric(rows: MetaAdsCampaignChartRow[], key: keyof MetaAdsCampaignChartRow) {
  return rows.reduce((max, row) => Math.max(max, Number(row[key] ?? 0)), 0);
}

function sortAds(rows: MetaAdsCampaignChartRow[]) {
  return [...rows].sort((a, b) => b.spend - a.spend || b.reach - a.reach);
}

export function MetaAdsComparison({ ads }: { ads: MetaAdsCampaignChartRow[] }) {
  if (ads.length === 0) return null;

  const sorted = sortAds(ads);

  return (
    <Card className="w-full min-w-0 border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">By ad</CardTitle>
        <CardDescription>
          Spend, messaging chats, and reach per ad — each metric scaled independently so smaller values stay readable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((ad) => (
          <AdMetricCard key={ad.name} ad={ad} maxima={sorted} />
        ))}
      </CardContent>
    </Card>
  );
}

function AdMetricCard({
  ad,
  maxima,
}: {
  ad: MetaAdsCampaignChartRow;
  maxima: MetaAdsCampaignChartRow[];
}) {
  return (
    <div className="w-full min-w-0 rounded-xl border border-border/80 bg-muted/20 p-4">
      <p className="font-medium leading-snug text-foreground">{ad.name}</p>
      <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {METRICS.map((metric) => {
          const value = ad[metric.key];
          const max = maxForMetric(maxima, metric.key);
          const pct = max > 0 ? Math.max(value > 0 ? 8 : 0, (value / max) * 100) : 0;

          return (
            <div key={metric.key} className="min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">{metric.format(value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, backgroundColor: metric.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
