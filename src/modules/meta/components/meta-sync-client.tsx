"use client";

import { useCallback, useState, useTransition } from "react";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { testMetaConnectionAction } from "@/modules/meta/server/meta-actions";
import type { MetaSyncHealth } from "@/modules/meta/server/meta-graph";

export function MetaCopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable (non-HTTPS, permissions)
    }
  }, [text]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onCopy}
      className={cn("shrink-0 gap-1.5", className)}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}

export type MetaSyncEnvFlags = {
  appId: boolean;
  appSecret: boolean;
  verifyToken: boolean;
  pageAccessToken: boolean;
};

function StepRow({
  stepNumber,
  done,
  title,
  hint,
}: {
  stepNumber: number;
  done: boolean;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/80 bg-card/40 px-3 py-2.5">
      <MotionlessStepBadge done={done} stepNumber={stepNumber} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function MotionlessStepBadge({ done, stepNumber }: { done: boolean; stepNumber: number }) {
  return (
    <div
      className={cn(
        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        done
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "border border-dashed border-border bg-muted/40 text-muted-foreground",
      )}
      aria-hidden
    >
      {done ? <CheckIcon className="size-3.5" /> : stepNumber}
    </div>
  );
}

export function MetaSetupProgress({ env }: { env: MetaSyncEnvFlags }) {
  const appPair = env.appId && env.appSecret;
  const steps = [appPair, env.verifyToken, env.pageAccessToken];
  const doneCount = steps.filter(Boolean).length;
  const pct = (doneCount / 3) * 100;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Credential checklist</span>
          <span>{doneCount}/3 complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <StepRow
          stepNumber={1}
          done={appPair}
          title="App ID & App secret"
          hint="Meta Developers → Your app → App settings → Basic. Set META_APP_ID and META_APP_SECRET in .env (never commit)."
        />
        <StepRow
          stepNumber={2}
          done={env.verifyToken}
          title="Webhook verify token"
          hint="Pick a long random string for META_VERIFY_TOKEN; use the same value when configuring the webhook in Meta."
        />
        <StepRow
          stepNumber={3}
          done={env.pageAccessToken}
          title="Page access token"
          hint="META_PAGE_ACCESS_TOKEN — Graph API Explorer for testing, or Business Manager / system user for production."
        />
      </div>
    </div>
  );
}

function ConnectionStatus({ health, error }: { health: MetaSyncHealth | null; error: string | null }) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!health) {
    return <p className="text-sm text-muted-foreground">Connection test has not been run yet.</p>;
  }

  if (!health.ok) {
    return <ConnectionStatusError message={health.error ?? "Meta connection failed"} />;
  }

  return (
    <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm">
      <p className="font-medium text-emerald-950 dark:text-emerald-50">Connected to Meta</p>
      {health.page ? (
        <p className="text-emerald-900/90 dark:text-emerald-100/90">
          Page <span className="font-medium">{health.page.name}</span>{" "}
          <span className="font-mono text-xs">({health.page.id})</span>
        </p>
      ) : null}
      {health.adAccount ? (
        <p className="text-emerald-900/90 dark:text-emerald-100/90">
          Ad account <span className="font-medium">{health.adAccount.name}</span>{" "}
          <span className="font-mono text-xs">({health.adAccount.id})</span>
        </p>
      ) : null}
    </div>
  );
}

function ConnectionStatusError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-50">
      <p className="font-medium">Connection check failed</p>
      <p className="mt-1 text-xs opacity-90">{message}</p>
    </div>
  );
}

export function MetaConnectionPanel({
  initialHealth,
  canTest,
}: {
  initialHealth: MetaSyncHealth | null;
  canTest: boolean;
}) {
  const [health, setHealth] = useState(initialHealth);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onTest = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await testMetaConnectionAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHealth(result.health);
    });
  }, []);

  return (
    <div className="space-y-4">
      <ConnectionStatus health={health} error={error} />
      {canTest ? (
        <Button type="button" variant="outline" size="sm" onClick={onTest} disabled={pending} className="gap-1.5">
          {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
          Test Graph API connection
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add <code className="rounded bg-muted px-1 font-mono">META_PAGE_ACCESS_TOKEN</code> to run a live connection
          test.
        </p>
      )}
    </div>
  );
}

export function MetaCopyValueRow({
  label,
  value,
  copyLabel = "Copy",
}: {
  label: string;
  value: string;
  copyLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-start gap-2 rounded-lg border bg-muted/30 p-2.5">
        <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-foreground">{value}</p>
        <MetaCopyButton text={value} label={copyLabel} />
      </div>
    </div>
  );
}
