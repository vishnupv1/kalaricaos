import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MetaCopyValueRow, MetaSetupProgress } from "@/modules/meta/components/meta-sync-client";
import {
  getMetaAssetSource,
  getMetaSyncEnvStatus,
  getMetaWebhookCallbackUrl,
  getResolvedMetaAdAccountAct,
  getResolvedMetaPageId,
} from "@/modules/meta/server/meta-sync-env";
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

export default async function MetaSyncPage() {
  await requireMetaAccess();
  const env = getMetaSyncEnvStatus();
  const assetSource = getMetaAssetSource();
  const webhookUrl = getMetaWebhookCallbackUrl();
  const readyForWebhook = env.appSecret && env.verifyToken && env.pageAccessToken;
  const pageId = getResolvedMetaPageId();
  const adAccountAct = getResolvedMetaAdAccountAct();
  const allCreds = env.appId && env.appSecret && env.verifyToken && env.pageAccessToken;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Meta sync</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Lead Ads will map into Kalarica leads with a stable{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">metaLeadId</code>. Finish the
              checklist below in your <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">.env</code>
              , then restart the dev server so values load.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
            Webhook route pending
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <DocLink href="https://developers.facebook.com/apps/">Meta Developers</DocLink>
          <DocLink href="https://developers.facebook.com/docs/graph-api/webhooks/getting-started">Webhooks guide</DocLink>
          <DocLink href="https://developers.facebook.com/tools/explorer/">Graph API Explorer</DocLink>
        </div>

        {!allCreds ? (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50">
            <p className="font-medium">Credentials still missing</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              Values are never shown on this page — only whether each variable is set. After editing{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/10">.env</code>, restart{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/10">npm run dev</code>.
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Setup progress</CardTitle>
            <CardDescription>Three steps before we can verify webhooks and fetch leads.</CardDescription>
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
          </CardContent>
        </Card>
      </div>

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
          <div className="flex flex-wrap gap-2">
            <Badge variant={assetSource.pageFromEnv ? "secondary" : "outline"} className="font-normal">
              Page ID {assetSource.pageFromEnv ? "from .env" : "default"}
            </Badge>
            <Badge variant={assetSource.adAccountFromEnv ? "secondary" : "outline"} className="font-normal">
              Ad account {assetSource.adAccountFromEnv ? "from .env" : "default"}
            </Badge>
          </div>
          <MetaCopyValueRow label="Page ID" value={pageId} copyLabel="Copy page ID" />
          <MetaCopyValueRow label="Ad account (Marketing API)" value={adAccountAct} copyLabel="Copy act id" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Webhooks and lead retrieval use the Page. Insights and campaign reads use the ad account id.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Variables to add</CardTitle>
          <CardDescription>Keep these server-side only; do not commit real tokens.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <ul className="space-y-2.5">
            <li>
              <span className="font-medium text-foreground">META_APP_ID</span> — App ID for Graph and debugging.
            </li>
            <li>
              <span className="font-medium text-foreground">META_APP_SECRET</span> — Used for webhook verification and
              server-side Graph calls.
            </li>
          </ul>
          <ul className="space-y-2.5">
            <li>
              <span className="font-medium text-foreground">META_VERIFY_TOKEN</span> — Your chosen string; Meta sends it
              during webhook setup.
            </li>
            <li>
              <span className="font-medium text-foreground">META_PAGE_ACCESS_TOKEN</span> — Page token with lead read
              access (long-lived in production).
            </li>
            <li>
              <span className="font-medium text-foreground">META_PAGE_ID</span> /{" "}
              <span className="font-medium text-foreground">META_AD_ACCOUNT_ID</span> — Optional overrides.
            </li>
          </ul>
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
            The route{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">POST /api/webhooks/meta/leadgen</code> is not
            implemented yet — Meta cannot deliver leads until that endpoint exists on a public HTTPS URL (or ngrok in
            dev).
          </p>
          <Separator />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Minimum env for webhook + lead fetch:</span>
            <Badge variant={readyForWebhook ? "secondary" : "outline"}>
              {readyForWebhook ? "Looks ready" : "Missing secret or token"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-muted/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">After sync is live</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <ul className="space-y-2">
            <li>
              Each Meta lead becomes a <strong className="font-medium text-foreground">Lead</strong> keyed by{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">metaLeadId</code> so retries do not duplicate.
            </li>
            <li>
              Default stage can stay <code className="rounded bg-muted px-1 font-mono text-xs">NEW</code>.
            </li>
            <li>
              Set <code className="rounded bg-muted px-1 font-mono text-xs">source</code> (e.g.{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">meta</code>) for reporting.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
