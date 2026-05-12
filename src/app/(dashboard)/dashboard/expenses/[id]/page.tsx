import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/modules/expenses/components/expense-form";
import { toDateInputValue, type ExpenseFormInput } from "@/modules/expenses/lib/expense-schemas";
import {
  getExpenseById,
  listExpenseCategoriesForSelect,
  listVendorsForExpenseForm,
} from "@/modules/expenses/server/expense-queries";
import { requireExpensesAccess } from "@/modules/expenses/server/require-expenses-access";

function toFormInput(expense: NonNullable<Awaited<ReturnType<typeof getExpenseById>>>): ExpenseFormInput {
  return {
    title: expense.title,
    amount: expense.amount,
    categoryId: expense.categoryId,
    vendorId: expense.vendorId ?? "",
    invoiceNumber: expense.invoiceNumber ?? "",
    paymentMode: expense.paymentMode,
    expenseDate: toDateInputValue(expense.expenseDate),
    status: expense.status,
    attachmentUrl: expense.attachmentUrl ?? "",
    notes: expense.notes ?? "",
  };
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireExpensesAccess();
  const { id } = await params;
  const [expense, categories, vendors] = await Promise.all([
    getExpenseById(id),
    listExpenseCategoriesForSelect(),
    listVendorsForExpenseForm(),
  ]);

  if (!expense) {
    notFound();
  }

  const updated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expense.updatedAt);

  const money = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(expense.amount);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/expenses" />}>
            ← Expenses
          </Button>
          <h1 className="font-heading text-2xl font-semibold">{expense.title}</h1>
          <p className="text-sm text-muted-foreground">
            {money} · {formatEnumLabel(expense.status)} · Last updated {updated}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{expense.category.name}</Badge>
            {expense.vendor ? <Badge variant="outline">{expense.vendor.name}</Badge> : null}
          </div>
        </div>
      </div>

      <ExpenseForm
        mode="edit"
        expenseId={expense.id}
        defaultValues={toFormInput(expense)}
        categories={categories}
        vendors={vendors}
      />
    </div>
  );
}
