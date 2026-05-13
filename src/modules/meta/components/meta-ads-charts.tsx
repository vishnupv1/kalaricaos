"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaAdsComparison } from "@/modules/meta/components/meta-ads-comparison";
import type { MetaAdsCampaignChartRow, MetaAdsDailyPoint } from "@/modules/meta/lib/meta-ads-chart-types";

const chartTick = { fill: "var(--color-muted-foreground)", fontSize: 11 };
const gridStroke = "var(--color-border)";
const colorPrimary = "var(--color-primary)";

function formatMoney(value: number) {
  return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatInt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

type MetaAdsChartsProps = {
  daily: MetaAdsDailyPoint[];
  campaigns: MetaAdsCampaignChartRow[];
};

export function MetaAdsCharts({ daily, campaigns }: MetaAdsChartsProps) {
  const hasDaily = daily.length > 0;
  const hasCampaigns = campaigns.length > 0;

  if (!hasDaily && !hasCampaigns) {
    return (
      <Card className="border-border/80 border-dashed shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sync from Meta to load charts for spend, reach, messaging chats, and conversions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {hasDaily ? (
        <>
          <ChartCard title="Spend over time" description="Daily ad spend (last 30 days)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartTick} interval="preserveStartEnd" />
                <YAxis tick={chartTick} tickFormatter={(v) => formatMoney(Number(v))} width={56} />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value ?? 0)), "Spend"]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{ borderRadius: 8, borderColor: "var(--color-border)" }}
                />
                <Line type="monotone" dataKey="spend" stroke={colorPrimary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Messaging & lead conversions" description="Daily chats started and lead form submissions">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartTick} interval="preserveStartEnd" />
                <YAxis tick={chartTick} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-border)" }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="messagingConversations"
                  name="Messaging"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="leadSubmissions"
                  name="Lead forms"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Reach & impressions" description="Daily audience reach and ad impressions">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartTick} interval="preserveStartEnd" />
                <YAxis tick={chartTick} tickFormatter={(v) => formatInt(Number(v))} width={48} />
                <Tooltip
                  formatter={(value, name) => [
                    formatInt(Number(value ?? 0)),
                    name === "reach" ? "Reach" : "Impressions",
                  ]}
                  contentStyle={{ borderRadius: 8, borderColor: "var(--color-border)" }}
                />
                <Legend />
                <Line type="monotone" dataKey="reach" name="Reach" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  name="Impressions"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Clicks" description="Daily clicks across all campaigns">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartTick} interval="preserveStartEnd" />
                <YAxis tick={chartTick} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-border)" }} />
                <Bar dataKey="clicks" name="Clicks" fill={colorPrimary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      ) : null}

      {hasCampaigns ? (
        <div className={hasDaily ? "lg:col-span-2" : undefined}>
          <MetaAdsComparison ads={campaigns} />
        </div>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className ? `border-border/80 shadow-sm ${className}` : "border-border/80 shadow-sm"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
