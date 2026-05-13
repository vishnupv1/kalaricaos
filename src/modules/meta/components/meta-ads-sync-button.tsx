"use client";

import { useCallback, useState, useTransition } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { syncMetaAdsAction } from "@/modules/meta/server/meta-actions";

export function MetaAdsSyncButton() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSync = useCallback(() => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await syncMetaAdsAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Synced ${result.syncedCampaigns} campaign${result.syncedCampaigns === 1 ? "" : "s"} from Meta.`);
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onSync} disabled={pending} className="gap-1.5">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
        Sync from Meta
      </Button>
      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
