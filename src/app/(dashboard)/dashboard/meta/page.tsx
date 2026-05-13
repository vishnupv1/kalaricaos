import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MetaConnectionPanel,
  MetaCopyValueRow,
  MetaSetupProgress,
} from "@/modules/meta/components/meta-sync-client";
import { getMetaSyncHealth } from "@/modules/meta/server/meta-graph";
import { getMetaLeadStats } from "@/modules/meta/server/meta-queries";
import {
  getMetaAssetSource,
  getMetaSyncEnvStatus,
  getMetaWebhookCallbackUrl,
  getResolvedMetaAdAccountAct,
  getResolvedMetaPageId,
} from "@/modules/meta/server/meta-sync-env";
import { getMetaMarketingAccessToken } from "@/modules/meta/server/meta-credentials";
import { requireMetaAccess } from "@/modules/meta/server/require-meta-access";

function EnvRow({ label, name, set }: { label: string; name: string; set: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{name}</p>
      </div>
      <Badge variant={set ? "secondary" : "outline"} className="shrink-0">
        {set ? "Set" : "Not set"}
      </Badge>
    </div>
  );
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
    >
      {children}
      <ExternalLinkIcon className="size-3 opacity-70" aria-hidden />
    </a>
  );
}

function formatLeadWhen(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function MetaSyncPage() {
  await requireMetaAccess();
  const env = getMetaSyncEnvStatus();
  const assetSource = getMetaAssetSource();
  const webhookUrl = getMetaWebhookCallbackUrl();
  const readyForWebhook = env.appSecret && env.verifyToken && env.pageAccessToken;
  const pageId = getResolvedMetaPageId();
  const adAccountAct = getResolvedMetaAdAccountAct();
  const allCreds = env.appId && env.appSecret && env.verifyToken && env.pageAccessToken;
  const hasMarketingToken = Boolean(getMetaMarketingAccessToken());

  const [initialHealth, leadStats] = await Promise.all([
    env.pageAccessToken ? getMetaSyncHealth() : Promise.resolve(null),
    getMetaLeadStats(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <MetaSyncHeader
        allCreds={allCreds}
        initialHealth={initialHealth}
        pageAccessTokenSet={env.pageAccessToken}
        hasMarketingToken={hasMarketingToken}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Setup progress</CardTitle>
            <CardDescription>Three steps before Meta can verify webhooks and deliver leads.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetaSetupProgress env={env} />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Environment status</CardTitle>
            <CardDescription>Set / not set only — secrets are never displayed.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/80">
            <EnvRow label="App ID" name="META_APP_ID" set={env.appId} />
            <EnvRow label="App secret" name="META_APP_SECRET" set={env.appSecret} />
            <EnvRow label="Webhook verify token" name="META_VERIFY_TOKEN" set={env.verifyToken} />
            <EnvRow label="Page access token" name="META_PAGE_ACCESS_TOKEN" set={env.pageAccessToken} />
            <EnvRow label="Marketing API token" name="META_MARKETING_ACCESS_TOKEN" set={hasMarketingToken} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Graph API connection</CardTitle>
          <CardDescription>
            Confirms your page token can read the Kalarica Page and ad account via Marketing API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetaConnectionPanel initialHealth={initialHealth} canTest={env.pageAccessToken} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Synced leads</CardTitle>
          <CardDescription>Leads created or updated from Meta Lead Ads webhooks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Total Meta leads in CRM</span>
            <Badge variant="secondary">{leadStats.totalMetaLeads}</Badge>
          </div>
          {leadStats.latestMetaLead ? (
            <p className="text-muted-foreground">
              Latest:{" "}
              <span className="font-medium text-foreground">
                {leadStats.latestMetaLead.fullName ?? leadStats.latestMetaLead.email ?? "Unnamed lead"}
              </span>{" "}
              <span className="font-mono text-xs">({leadStats.latestMetaLead.metaLeadId})</span> —{" "}
              {formatLeadWhen(leadStats.latestMetaLead.createdAt)}
            </p>
          ) : (
            <p className="text-muted-foreground">
              No Meta leads yet. After webhook subscription is live, new Lead Ads submissions will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kalarica Meta assets</CardTitle>
          <CardDescription>
            Defaults are wired in code. Set{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">META_PAGE_ID</code> /{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">META_AD_ACCOUNT_ID</code> in{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">.env</code> to override (e.g. staging).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <MetaAssetsBadges assetSource={assetSource} />
          <MetaCopyValueRow label="Page ID" value={pageId} copyLabel="Copy page ID" />
          <MetaCopyValueRow label="Ad account (Marketing API)" value={adAccountAct} copyLabel="Copy act id" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Webhooks and lead retrieval use the Page. Insights and campaign reads use the ad account id.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Webhook callback URL</CardTitle>
          <CardDescription>
            Subscribe your Page to <code className="rounded bg-muted px-1 font-mono text-xs">leadgen</code> in Meta
            Developers using this callback URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaCopyValueRow label="Callback URL" value={webhookUrl} copyLabel="Copy URL" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <code className="rounded bg-muted px-1 font-mono text-xs">GET</code> handles Meta&apos;s verification
            handshake. <code className="rounded bg-muted px-1 font-mono text-xs">POST</code> ingests{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">leadgen</code> events, fetches lead field data from
            Graph API, and upserts into <code className="rounded bg-muted px-1 font-mono text-xs">Lead</code> by{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">metaLeadId</code>. Deploy to a public HTTPS URL
            (or use ngrok locally) before clicking Verify and save in Meta.
          </p>
          <Separator />
          <WebhookReadiness readyForWebhook={readyForWebhook} allCreds={allCreds} />
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-muted/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How leads map</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <ul className="space-y-2">
            <li>
              Each Meta lead becomes a <strong className="font-medium text-foreground">Lead</strong> keyed by{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">metaLeadId</code> so retries do not duplicate.
            </li>
            <li>
              Default stage stays <code className="rounded bg-muted px-1 font-mono text-xs">NEW</code>;{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">source</code> is set to{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">meta</code>.
            </li>
            <li>
              A <code className="rounded bg-muted px-1 font-mono text-xs">LeadActivity</code> row is written on each
              webhook create or update.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaSyncHeader({
  allCreds,
  initialHealth,
  pageAccessTokenSet,
  hasMarketingToken,
}: {
  allCreds: boolean;
  initialHealth: Awaited<ReturnType<typeof getMetaSyncHealth>> | null;
  pageAccessTokenSet: boolean;
  hasMarketingToken: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Meta sync</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Lead Ads webhooks sync into Kalarica with a stable{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">metaLeadId</code>. Configure Meta
            Developers with the callback URL below, then submit a test lead to confirm end-to-end delivery.
          </p>
        </div>
        <MetaSyncHeaderBadges initialHealth={initialHealth} hasMarketingToken={hasMarketingToken} />
      </div>

      <div className="flex flex-wrap gap-2">
        <DocLink href="https://developers.facebook.com/apps/">Meta Developers</DocLink>
        <DocLink href="https://developers.facebook.com/docs/graph-api/webhooks/getting-started">Webhooks guide</DocLink>
        <DocLink href="https://developers.facebook.com/tools/explorer/">Graph API Explorer</DocLink>
      </div>

      {!allCreds ? (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50">
          <p className="font-medium">One or more credentials still missing</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">
            Values are never shown on this page — only whether each variable is set. After editing{" "}
            <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/10">.env</code>, restart{" "}
            <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/10">npm run dev</code>.
            {!pageAccessTokenSet ? " You still need META_PAGE_ACCESS_TOKEN for lead fetch and connection tests." : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MetaSyncHeaderBadges({
  initialHealth,
  hasMarketingToken,
}: {
  initialHealth: Awaited<ReturnType<typeof getMetaSyncHealth>> | null;
  hasMarketingToken: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" render={<Link href="/dashboard/meta/ads" />}>
          Ads analytics
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/meta/messages" />}>
          Ad messages
        </Button>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Badge variant="secondary" className="shrink-0 font-normal">
          Webhook live
        </Badge>
        {initialHealth?.ok ? (
          <Badge variant="secondary" className="shrink-0 border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-800 dark:text-emerald-300">
            Graph API OK
          </Badge>
        ) : null}
        {hasMarketingToken ? (
          <Badge variant="outline" className="shrink-0 font-normal">
            Marketing token set
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function MetaAssetsBadges({
  assetSource,
}: {
  assetSource: { pageFromEnv: boolean; adAccountFromEnv: boolean };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={assetSource.pageFromEnv ? "secondary" : "outline"} className="font-normal">
        Page ID {assetSource.pageFromEnv ? "from .env" : "default"}
      </Badge>
      <Badge variant={assetSource.adAccountFromEnv ? "secondary" : "outline"} className="font-normal">
        Ad account {assetSource.adAccountFromEnv ? "from .env" : "default"}
      </Badge>
    </div>
  );
}

function WebhookReadiness({
  readyForWebhook,
  allCreds,
}: {
  readyForWebhook: boolean;
  allCreds: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Webhook + lead fetch env:</span>
      <Badge variant={readyForWebhook ? "secondary" : "outline"}>
        {readyForWebhook ? "Ready for Meta verify" : "Missing secret or token"}
      </Badge>
      {allCreds ? (
        <Badge variant="secondary" className="font-normal">
          All four vars set
        </Badge>
      ) : null}
    </div>
  );
}
