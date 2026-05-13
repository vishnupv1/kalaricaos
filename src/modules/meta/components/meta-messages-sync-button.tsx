"use client";

import { useCallback, useState, useTransition } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { syncMetaMessagesAction } from "@/modules/meta/server/meta-messages-actions";

function formatSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Failed to sync messages from Meta";
  if (message.includes("Failed to find Server Action")) {
    return "The app was rebuilt while this page was open. Hard-refresh the page (Cmd+Shift+R), then try Sync again.";
  }
  return message;
}

export function MetaMessagesSyncButton() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSync = useCallback(() => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await syncMetaMessagesAction();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage(
          `Synced ${result.synced} thread${result.synced === 1 ? "" : "s"} (${result.messenger} Messenger · ${result.instagram} Instagram) · ${result.unread} unread · ${result.read} read · ${result.replied} replied`,
        );
      } catch (e) {
        setError(formatSyncError(e));
      }
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onSync} disabled={pending} className="gap-1.5">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
        Sync messages
      </Button>
      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}