"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetaAdsCampaignChartRow } from "@/modules/meta/lib/meta-ads-chart-types";

const chartTick = { fill: "var(--color-muted-foreground)", fontSize: 11 };
const gridStroke = "var(--color-border)";

const METRICS = [
  { key: "spend" as const, label: "Spend", color: "var(--color-primary)", format: formatMoney },
  { key: "messagingConversations" as const, label: "Messaging", color: "#0ea5e9", format: formatInt },
  { key: "reach" as const, label: "Reach", color: "#8b5cf6", format: formatInt },
  { key: "impressions" as const, label: "Impressions", color: "#f59e0b", format: formatInt },
  { key: "clicks" as const, label: "Clicks", color: "#64748b", format: formatInt },
];

const FOCUS_METRICS = METRICS.slice(0, 3);

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

function metricChartData(rows: MetaAdsCampaignChartRow[], key: (typeof METRICS)[number]["key"]) {
  return sortAds(rows).map((row) => ({
    name: row.name,
    value: row[key],
  }));
}

function yAxisWidth(names: string[]) {
  const longest = names.reduce((m, n) => Math.max(m, n.length), 0);
  return Math.min(480, Math.max(120, longest * 6.5));
}

function barChartHeight(rowCount: number) {
  return Math.max(220, rowCount * 52 + 48);
}

export function MetaAdsComparison({ ads }: { ads: MetaAdsCampaignChartRow[] }) {
  if (ads.length === 0) return null;

  const sorted = sortAds(ads);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
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

      <div className="flex w-full min-w-0 flex-col gap-4">
        {FOCUS_METRICS.map((metric) => (
          <MetricBarChart key={metric.key} ads={sorted} metric={metric} />
        ))}
      </div>
    </div>
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

function MetricBarChart({
  ads,
  metric,
}: {
  ads: MetaAdsCampaignChartRow[];
  metric: (typeof METRICS)[number];
}) {
  const data = metricChartData(ads, metric.key);
  const names = data.map((d) => d.name);
  const height = barChartHeight(data.length);

  return (
    <Card className="w-full min-w-0 border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{metric.label} by ad</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 pt-0">
        <div className="w-full min-w-0" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={chartTick} tickFormatter={(v) => metric.format(Number(v))} />
              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth(names)}
                tick={{ ...chartTick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <Tooltip
                formatter={(value) => [metric.format(Number(value ?? 0)), metric.label]}
                labelFormatter={(label) => String(label)}
                contentStyle={{ borderRadius: 8, borderColor: "var(--color-border)" }}
              />
              <Bar dataKey="value" fill={metric.color} radius={[0, 4, 4, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
