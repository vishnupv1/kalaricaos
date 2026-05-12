import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/modules/expenses/components/expense-form";
import {
  listExpenseCategoriesForSelect,
  listVendorsForExpenseForm,
} from "@/modules/expenses/server/expense-queries";
import { requireExpensesAccess } from "@/modules/expenses/server/require-expenses-access";

export default async function NewExpensePage() {
  await requireExpensesAccess();
  const [categories, vendors] = await Promise.all([listExpenseCategoriesForSelect(), listVendorsForExpenseForm()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/expenses" />}>
          ← Expenses
        </Button>
      </div>
      <ExpenseForm mode="create" categories={categories} vendors={vendors} />
    </div>
  );
}
