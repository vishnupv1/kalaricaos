import type { ComponentProps } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadStage } from "@/generated/prisma";
import { LeadStage as LeadStageEnum } from "@/generated/prisma";
import { getLeadStageCounts, listLeads } from "@/modules/leads/server/lead-queries";
import { requireLeadsAccess } from "@/modules/leads/server/require-leads-access";

function leadsHref(opts: { q?: string; stage?: string; source?: string; page: number }) {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  if (opts.stage) params.set("stage", opts.stage);
  if (opts.source) params.set("source", opts.source);
  if (opts.page > 1) params.set("page", String(opts.page));
  const s = params.toString();
  return s ? `/dashboard/leads?${s}` : "/dashboard/leads";
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function stageBadgeVariant(stage: LeadStage): ComponentProps<typeof Badge>["variant"] {
  switch (stage) {
    case "WON":
      return "default";
    case "LOST":
      return "destructive";
    case "NEGOTIATION":
    case "INTERESTED":
      return "secondary";
    default:
      return "outline";
  }
}

function displayName(fullName: string | null, email: string | null) {
  return fullName?.trim() || email?.trim() || "Unnamed lead";
}

const selectClass =
  "h-8 min-w-[140px] rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; source?: string; page?: string }>;
}) {
  await requireLeadsAccess();
  const sp = await searchParams;
  const q = sp.q;
  const source = sp.source;
  const stageParam = sp.stage;
  const stage =
    stageParam && Object.values(LeadStageEnum).includes(stageParam as LeadStage)
      ? (stageParam as LeadStage)
      : undefined;
  const rawPage = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [{ items, total, page: currentPage, totalPages }, stageCounts] = await Promise.all([
    listLeads({ search: q, stage, source, page }),
    getLeadStageCounts(),
  ]);

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const hasFilters = Boolean(q?.trim() || stage || source);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <LeadsHeader total={total} newCount={stageCounts.NEW} />

      <form method="get" action="/dashboard/leads" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="page" value="1" />
        <div className="grid min-w-[200px] flex-1 gap-1.5">
          <label htmlFor="lead-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input id="lead-search" name="q" placeholder="Name, email, phone, Meta id…" defaultValue={q ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="lead-stage" className="text-xs font-medium text-muted-foreground">
            Stage
          </label>
          <select id="lead-stage" name="stage" defaultValue={stage ?? ""} className={selectClass}>
            <option value="">All stages</option>
            {Object.values(LeadStageEnum).map((s) => (
              <option key={s} value={s}>
                {formatEnumLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="lead-source" className="text-xs font-medium text-muted-foreground">
            Source
          </label>
          <select id="lead-source" name="source" defaultValue={source ?? ""} className={selectClass}>
            <option value="">All sources</option>
            <option value="meta">Meta</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters ? (
          <Button variant="outline" render={<Link href="/dashboard/leads" />}>
            Clear
          </Button>
        ) : null}
      </form>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No leads match your filters.
                  {!hasFilters ? (
                    <>
                      {" "}
                      <Link href="/dashboard/meta" className="underline underline-offset-4">
                        Set up Meta sync
                      </Link>{" "}
                      or add a lead manually.
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[220px] whitespace-normal font-medium">
                    <Link
                      href={`/dashboard/leads/${row.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {displayName(row.fullName, row.email)}
                    </Link>
                    {row.metaLeadId ? (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.metaLeadId}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{row.email ?? "—"}</div>
                    {row.phone ? <div>{row.phone}</div> : null}
                  </TableCell>
                  <TableCell>
                    {row.source ? (
                      <Badge variant="outline" className="font-normal capitalize">
                        {row.source}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={stageBadgeVariant(row.stage)}>{formatEnumLabel(row.stage)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dateFmt.format(row.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={leadsHref({ q, stage, source, page: currentPage - 1 })} />}
              >
                Previous
              </Button>
            )}
            {currentPage >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={leadsHref({ q, stage, source, page: currentPage + 1 })} />}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LeadsHeader({ total, newCount }: { total: number; newCount: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {total} lead{total === 1 ? "" : "s"} · {newCount} new · pipeline and Meta intake
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href="/dashboard/meta" />}>
          Meta sync
        </Button>
        <Button render={<Link href="/dashboard/leads/new" />}>Add lead</Button>
      </div>
    </div>
  );
}
