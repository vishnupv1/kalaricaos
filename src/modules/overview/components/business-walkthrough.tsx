import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { AppRole, LeadStage } from "@/generated/prisma";
import type { BusinessOverview } from "@/modules/overview/server/overview-queries";
import { APP_ROLE_LABELS } from "@/types/app-role";

const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const moneyPrecise = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const LEAD_STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: "NEW", label: "New", color: "bg-slate-400" },
  { key: "CONTACTED", label: "Contacted", color: "bg-sky-500" },
  { key: "INTERESTED", label: "Interested", color: "bg-amber-500" },
  { key: "NEGOTIATION", label: "Negotiation", color: "bg-orange-500" },
  { key: "WON", label: "Won", color: "bg-emerald-500" },
  { key: "LOST", label: "Lost", color: "bg-rose-400" },
];

type BusinessWalkthroughProps = {
  userName: string | null;
  userEmail: string | null;
  role: AppRole;
  data: BusinessOverview;
};

export function BusinessWalkthrough({ userName, userEmail, role, data }: BusinessWalkthroughProps) {
  const pulseMetrics = buildPulseMetrics(data);

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {APP_ROLE_LABELS[role]}
          </Badge>
          {userEmail ? <span className="text-xs text-muted-foreground">{userEmail}</span> : null}
        </div>
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            {userName ? `Kalarica's business` : "Kalarica's business"}
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            A single walkthrough of how Kalarica is running — from ads and leads through catalog, spend, and fulfillment.
          </p>
        </div>
      </header>

      {pulseMetrics.length > 0 ? (
        <section aria-label="Business pulse">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pulseMetrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
            ))}
          </div>
        </section>
      ) : null}

      <ol className="relative space-y-8 before:absolute before:left-[1.125rem] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border md:before:left-5">
        {data.marketing ? (
          <WalkthroughStep
            step={1}
            title="Marketing"
            description="How you're attracting attention — Meta ad spend, reach, and conversations started from campaigns."
            href="/dashboard/meta/ads"
            linkLabel="Open ads analytics"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Ad spend (30d)"
                value={`₹${moneyPrecise.format(data.marketing.spend)}`}
                hint={`Across ${data.marketing.campaignCount} campaigns`}
              />
              <MetricCard label="Reach" value={int.format(data.marketing.reach)} hint="People who saw your ads" />
              <MetricCard
                label="Messaging chats"
                value={int.format(data.marketing.messagingConversations)}
                hint="Conversations started from ads"
              />
              <MetricCard
                label="Lead form fills"
                value={int.format(data.marketing.leadSubmissions)}
                hint="Instant form submissions in Ads Manager"
              />
            </div>
            {data.marketing.lastSynced ? (
              <p className="text-xs text-muted-foreground">
                Last synced{" "}
                {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                  data.marketing.lastSynced,
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No sync yet — connect Meta and pull campaign data from{" "}
                <Link href="/dashboard/meta" className="underline underline-offset-4">
                  Meta sync
                </Link>
                .
              </p>
            )}
          </WalkthroughStep>
        ) : null}

        {data.leads ? (
          <WalkthroughStep
            step={data.marketing ? 2 : 1}
            title="Sales pipeline"
            description="Leads entering your CRM — from Meta Lead Ads and manual entry — and where they sit in the funnel."
            href="/dashboard/leads"
            linkLabel="Manage leads"
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total leads" value={int.format(data.leads.total)} hint="All active leads in CRM" />
                <MetricCard
                  label="Active pipeline"
                  value={int.format(data.leads.activePipeline)}
                  hint="New through negotiation"
                />
                <MetricCard label="Won" value={int.format(data.leads.won)} hint="Closed successfully" />
                <MetricCard
                  label="From Meta"
                  value={int.format(data.leads.metaLeads)}
                  hint={
                    data.leads.latestMetaLeadName
                      ? `Latest · ${data.leads.latestMetaLeadName}`
                      : "Webhook-synced Lead Ads"
                  }
                />
              </div>

              <Card className="border-border/80 bg-muted/20 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline breakdown</CardTitle>
                  <CardDescription>Share of leads at each stage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PipelineBar stageCounts={data.leads.stageCounts} total={data.leads.total} />
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {LEAD_STAGES.map((stage) => (
                      <span key={stage.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`size-2 rounded-full ${stage.color}`} />
                        {stage.label} · {int.format(data.leads!.stageCounts[stage.key])}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </WalkthroughStep>
        ) : null}

        {data.catalog ? (
          <WalkthroughStep
            step={countPriorSteps(data, "catalog")}
            title="Catalog & supply"
            description="What you sell and who supplies it — product catalog health and stock levels across vendors."
            href="/dashboard/products"
            linkLabel="View products"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Products" value={int.format(data.catalog.productCount)} hint="SKUs in your catalog" />
              <MetricCard
                label="Vendors"
                value={int.format(data.catalog.vendorCount)}
                hint="Active supplier relationships"
              />
              <MetricCard
                label="Low stock"
                value={int.format(data.catalog.lowStockCount)}
                hint="At or below reorder threshold"
                className={data.catalog.lowStockCount > 0 ? "border-amber-500/40 bg-amber-500/5" : undefined}
              />
              <MetricCard
                label="Stock value"
                value={`₹${money.format(data.catalog.inventoryValue)}`}
                hint="Qty × cost price (on hand)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" render={<Link href="/dashboard/vendors" />}>
                Vendors
              </Button>
              {data.operations ? (
                <Button variant="outline" size="sm" render={<Link href="/dashboard/inventory" />}>
                  Inventory
                </Button>
              ) : null}
            </div>
          </WalkthroughStep>
        ) : null}

        {data.finance ? (
          <WalkthroughStep
            step={countPriorSteps(data, "finance")}
            title="Finance"
            description="Operating spend tracked in Kalarica — what's awaiting approval and what cleared this month."
            href="/dashboard/expenses"
            linkLabel="Review expenses"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Total expenses"
                value={int.format(data.finance.totalExpenses)}
                hint="Recorded in the system"
              />
              <MetricCard
                label="Awaiting payment"
                value={`₹${moneyPrecise.format(data.finance.pendingAmount)}`}
                hint={`${int.format(data.finance.pendingCount)} draft / approved items`}
                className={data.finance.pendingCount > 0 ? "border-amber-500/40 bg-amber-500/5" : undefined}
              />
              <MetricCard
                label="Paid this month"
                value={`₹${moneyPrecise.format(data.finance.paidThisMonth)}`}
                hint="Marked paid in the current calendar month"
              />
            </div>
          </WalkthroughStep>
        ) : null}

        {data.operations ? (
          <WalkthroughStep
            step={countPriorSteps(data, "operations")}
            title="Fulfillment"
            description="Orders and stock movement — revenue booked and inventory activity over the last 30 days."
            href="/dashboard/orders"
            linkLabel="Orders"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Orders"
                value={int.format(data.operations.orderCount)}
                hint={data.operations.orderCount === 0 ? "Module ready — create your first order" : "All time"}
              />
              <MetricCard
                label="Revenue"
                value={`₹${moneyPrecise.format(data.operations.revenue)}`}
                hint="Non-cancelled order totals"
              />
              <MetricCard
                label="Stock movements"
                value={int.format(data.operations.inventoryMovements30d)}
                hint="Inventory adjustments (last 30 days)"
              />
            </div>
            {data.operations.orderCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Orders and invoicing are wired to your data model — start recording sales to see revenue flow through this
                step.
              </p>
            ) : null}
          </WalkthroughStep>
        ) : null}
      </ol>
    </div>
  );
}

function WalkthroughStep({
  step,
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  step: number;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-12 md:pl-14">
      <span
        aria-hidden
        className="absolute left-0 flex size-9 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground md:left-1 md:size-8"
      >
        {step}
      </span>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 gap-1" render={<Link href={href} />}>
            {linkLabel}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        {children}
      </div>
    </li>
  );
}

function PipelineBar({
  stageCounts,
  total,
}: {
  stageCounts: Record<LeadStage, number>;
  total: number;
}) {
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No leads yet — sync Meta or add your first lead manually.</p>;
  }

  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
      {LEAD_STAGES.map((stage) => {
        const count = stageCounts[stage.key];
        if (count === 0) return null;
        const width = (count / total) * 100;
        return (
          <div
            key={stage.key}
            className={`${stage.color} min-w-[2px]`}
            style={{ width: `${width}%` }}
            title={`${stage.label}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function countPriorSteps(data: BusinessOverview, section: "catalog" | "finance" | "operations"): number {
  let step = 1;
  if (data.marketing) step += 1;
  if (data.leads) step += 1;
  if (section === "catalog") return step;
  if (data.catalog) step += 1;
  if (section === "finance") return step;
  if (data.finance) step += 1;
  return step;
}

function buildPulseMetrics(data: BusinessOverview) {
  const metrics: { label: string; value: string; hint: string }[] = [];

  if (data.leads) {
    metrics.push({
      label: "Active pipeline",
      value: int.format(data.leads.activePipeline),
      hint: `${int.format(data.leads.won)} won · ${int.format(data.leads.total)} total leads`,
    });
  }

  if (data.marketing) {
    metrics.push({
      label: "Ad spend (30d)",
      value: `₹${moneyPrecise.format(data.marketing.spend)}`,
      hint: `${int.format(data.marketing.messagingConversations)} messaging chats`,
    });
  }

  if (data.finance) {
    metrics.push({
      label: "Spend this month",
      value: `₹${moneyPrecise.format(data.finance.paidThisMonth)}`,
      hint: `${int.format(data.finance.pendingCount)} items awaiting payment`,
    });
  }

  if (data.catalog) {
    metrics.push({
      label: "Catalog",
      value: int.format(data.catalog.productCount),
      hint:
        data.catalog.lowStockCount > 0
          ? `${int.format(data.catalog.lowStockCount)} SKUs low on stock`
          : `${int.format(data.catalog.vendorCount)} vendors`,
    });
  }

  if (data.operations && data.operations.orderCount > 0) {
    metrics.push({
      label: "Revenue",
      value: `₹${moneyPrecise.format(data.operations.revenue)}`,
      hint: `${int.format(data.operations.orderCount)} orders`,
    });
  }

  return metrics.slice(0, 4);
}
