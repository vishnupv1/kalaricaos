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
import type { ExpenseStatus } from "@/generated/prisma";
import { ExpenseRowActions } from "@/modules/expenses/components/expense-row-actions";
import { listExpenses } from "@/modules/expenses/server/expense-queries";
import { requireExpensesAccess } from "@/modules/expenses/server/require-expenses-access";

function expensesHref(q: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set("q", q.trim());
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const s = params.toString();
  return s ? `/dashboard/expenses?${s}` : "/dashboard/expenses";
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function statusBadgeVariant(status: ExpenseStatus): ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "REJECTED":
      return "destructive";
    case "PAID":
      return "default";
    case "APPROVED":
      return "secondary";
    case "PENDING_APPROVAL":
      return "outline";
    default:
      return "outline";
  }
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireExpensesAccess();
  const sp = await searchParams;
  const q = sp.q;
  const rawPage = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { items, total, page: currentPage, totalPages } = await listExpenses({
    search: q,
    page,
  });

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  });

  const money = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {total} expense{total === 1 ? "" : "s"} · approvals and payment tracking
          </p>
        </div>
        <Button render={<Link href="/dashboard/expenses/new" />}>Add expense</Button>
      </div>

      <form method="get" action="/dashboard/expenses" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="page" value="1" />
        <div className="grid min-w-[200px] flex-1 gap-1.5">
          <label htmlFor="expense-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input id="expense-search" name="q" placeholder="Title, invoice #, notes…" defaultValue={q ?? ""} />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q?.trim() ? (
          <Button variant="outline" render={<Link href="/dashboard/expenses" />}>
            Clear
          </Button>
        ) : null}
      </form>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No expenses match your filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[220px] whitespace-normal font-medium">
                    <Link
                      href={`/dashboard/expenses/${row.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.category.name}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-muted-foreground">{row.vendor?.name ?? "—"}</TableCell>
                  <TableCell className="tabular-nums font-medium">{money.format(row.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{dateFmt.format(row.expenseDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatEnumLabel(row.paymentMode)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.status)}>{formatEnumLabel(row.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ExpenseRowActions expenseId={row.id} label={row.title} />
                  </TableCell>
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
              <Button variant="outline" size="sm" render={<Link href={expensesHref(q, currentPage - 1)} />}>
                Previous
              </Button>
            )}
            {currentPage >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" render={<Link href={expensesHref(q, currentPage + 1)} />}>
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
