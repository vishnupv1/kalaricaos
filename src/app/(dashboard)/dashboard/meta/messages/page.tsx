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
import type { MetaConversationStatus } from "@/generated/prisma";
import { MetaConversationThread } from "@/modules/meta/components/meta-conversation-thread";
import { MetaCopyButton } from "@/modules/meta/components/meta-sync-client";
import { MetaMessagesSyncButton } from "@/modules/meta/components/meta-messages-sync-button";
import { MetaMessagingSetupCard } from "@/modules/meta/components/meta-messaging-setup-card";
import {
  getMetaConversationStatusCounts,
  listMetaConversationRows,
} from "@/modules/meta/server/meta-conversation-queries";
import { getMetaPageAccessToken } from "@/modules/meta/server/meta-credentials";
import { getMetaMessagingAccessHealth } from "@/modules/meta/server/meta-messaging-health";
import { getMetaMessagingWebhookCallbackUrl, getMetaWebhookCallbackUrl } from "@/modules/meta/server/meta-sync-env";
import { requireMetaAccess } from "@/modules/meta/server/require-meta-access";

function statusBadgeVariant(status: MetaConversationStatus) {
  switch (status) {
    case "UNREAD":
      return "default" as const;
    case "REPLIED":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: MetaConversationStatus) {
  switch (status) {
    case "UNREAD":
      return "Unread";
    case "READ":
      return "Read";
    case "REPLIED":
      return "Replied";
  }
}

function formatWhen(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function MetaMessagesPage() {
  await requireMetaAccess();

  const hasPageToken = Boolean(getMetaPageAccessToken());
  const [rows, counts, messagingHealth] = await Promise.all([
    listMetaConversationRows(),
    getMetaConversationStatusCounts(),
    hasPageToken ? getMetaMessagingAccessHealth() : Promise.resolve(null),
  ]);

  const messagingWebhookUrl = getMetaMessagingWebhookCallbackUrl();
  const pageWebhookUrl = getMetaWebhookCallbackUrl();

  return (
    <div className="w-full space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/meta" />}>
            ← Meta sync
          </Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Ad messages</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Real Messenger and Instagram DM threads from your Page inbox — not the aggregate Messaging count on Meta ads.
            Sync pulls history; the messaging webhook captures new messages as they arrive.
          </p>
        </div>
        <MetaMessagesSyncButton />
      </div>

      {!hasPageToken ? (
        <Card>
          <CardHeader>
            <CardTitle>Page token required</CardTitle>
            <CardDescription>
              Set <code className="text-xs">META_PAGE_ACCESS_TOKEN</code> with{" "}
              <code className="text-xs">pages_messaging</code> (and related page permissions) to sync conversations.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : messagingHealth ? (
        <MetaMessagingSetupCard health={messagingHealth} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messaging webhook</CardTitle>
          <CardDescription>
            Use the same Page callback as leads, or the dedicated messaging URL after deploy. Subscribe to{" "}
            <code className="text-xs">messages</code> on your Page webhook (product: Page).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Use now (live on production)</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">{pageWebhookUrl}</code>
              <MetaCopyButton text={pageWebhookUrl} label="Copy URL" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Same callback as leads — add the <code className="font-mono">messages</code> field on your Page subscription.
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Dedicated URL (after next deploy)</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">{messagingWebhookUrl}</code>
              <MetaCopyButton text={messagingWebhookUrl} label="Copy URL" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unread</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-amber-700 dark:text-amber-400">{counts.UNREAD}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Read</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.READ}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Replied</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-emerald-700 dark:text-emerald-400">
              {counts.REPLIED}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "No threads yet. Sync pulls Messenger + Instagram inbox history. If Meta returns empty, use the webhook above and send a test DM to your Page."
              : `${rows.length} thread${rows.length === 1 ? "" : "s"} with stored message bodies.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-6 sm:pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Ad</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No messages to show.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.participantName ?? "Unknown"}</div>
                      {row.snippet ? (
                        <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-muted-foreground">{row.snippet}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.platform === "INSTAGRAM" ? "Instagram" : row.platform === "MESSENGER" ? "Messenger" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      {row.unreadCount > 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">({row.unreadCount})</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden max-w-[12rem] truncate md:table-cell">{row.adName ?? "—"}</TableCell>
                    <TableCell className="min-w-[10rem]">
                      <MetaConversationThread messages={row.messages} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatWhen(row.lastMessageAt ?? row.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
