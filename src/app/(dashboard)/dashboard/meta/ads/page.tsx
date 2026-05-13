import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetaAdsSyncButton } from "@/modules/meta/components/meta-ads-sync-button";
import {
  getCampaignDashboardTotals,
  getLatestCampaignSyncDate,
  listCampaignDashboardRows,
} from "@/modules/meta/server/campaign-queries";
import { getMetaMarketingAccessToken } from "@/modules/meta/server/meta-credentials";
import { requireMetaAccess } from "@/modules/meta/server/require-meta-access";

function formatObjective(value: string | null) {
  if (!value) return "—";
  return value
    .replace(/^OUTCOME_/, "")
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function formatStatus(status: string | null) {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export default async function MetaAdsAnalyticsPage() {
  await requireMetaAccess();

  const hasMarketingToken = Boolean(getMetaMarketingAccessToken());
  const [rows, lastSync] = await Promise.all([listCampaignDashboardRows(), getLatestCampaignSyncDate()]);
  const totals = await getCampaignDashboardTotals(rows);

  const money = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const int = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

  const syncLabel = lastSync
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(lastSync)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/meta" />}>
            ← Meta sync
          </Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Ads analytics</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reach, messaging conversations, spend, and impressions from your Meta ad account (last 30 days per sync).
          </p>
          {syncLabel ? (
            <p className="text-xs text-muted-foreground">Last synced {syncLabel}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No sync yet — pull data from Meta below.</p>
          )}
        </div>
        <MetaAdsSyncButton />
      </div>

      {!hasMarketingToken ? (
        <Card className="border-amber-500/35 bg-amber-500/10">
          <CardContent className="py-4 text-sm text-amber-950 dark:text-amber-50">
            Set <code className="rounded bg-black/5 px-1 font-mono dark:bg-white/10">META_MARKETING_ACCESS_TOKEN</code>{" "}
            in <code className="rounded bg-black/5 px-1 font-mono dark:bg-white/10">.env</code> — a User token from
            Graph API Explorer with <code className="rounded bg-black/5 px-1 font-mono dark:bg-white/10">ads_read</code>{" "}
            (and access to your ad account). Page lead tokens usually cannot read campaign insights.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Reach" value={int.format(totals.reach)} hint="People who saw ads" />
        <MetricCard label="Messaging conversations" value={int.format(totals.messagingConversations)} hint="Chats started from ads" />
        <MetricCard label="Impressions" value={int.format(totals.impressions)} hint="Times ads were shown" />
        <MetricCard label="Spend" value={`₹${money.format(totals.spend)}`} hint="Last 30 days (account currency)" />
        <MetricCard label="Clicks" value={int.format(totals.clicks)} hint="All click types" />
        <MetricCard label="Lead form submissions" value={int.format(totals.leadSubmissions)} hint="Instant form leads in ads" />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaigns</CardTitle>
          <CardDescription>
            Matches what you see in Ads Manager — messaging results, reach, spend, and more per campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Messaging</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No campaign data yet. Click <strong className="font-medium text-foreground">Sync from Meta</strong>{" "}
                      after setting your marketing token.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[220px] whitespace-normal font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatObjective(row.objective)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal capitalize">
                          {formatStatus(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{int.format(row.reach)}</TableCell>
                      <TableCell className="text-right tabular-nums">{int.format(row.messagingConversations)}</TableCell>
                      <TableCell className="text-right tabular-nums">{int.format(row.impressions)}</TableCell>
                      <TableCell className="text-right tabular-nums">{int.format(row.clicks)}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{money.format(row.spend)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        CRM leads from Lead Ads webhooks appear on{" "}
        <Link href="/dashboard/leads" className="underline underline-offset-4">
          Leads
        </Link>
        . This page shows ad performance metrics (reach, chats, spend) from the Marketing API.
      </p>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
