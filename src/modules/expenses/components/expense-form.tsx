"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { ExpenseStatus, PaymentMode } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createExpenseAction, updateExpenseAction } from "@/modules/expenses/server/expense-actions";
import {
  expenseFormFieldsSchema,
  toDateInputValue,
  type ExpenseFormInput,
  type ExpenseFormValues,
} from "@/modules/expenses/lib/expense-schemas";
import { cn } from "@/lib/utils";

function buildDefaultExpenseValues(): ExpenseFormInput {
  return {
    title: "",
    amount: 0,
    categoryId: "",
    vendorId: "",
    invoiceNumber: "",
    paymentMode: PaymentMode.OTHER,
    expenseDate: toDateInputValue(new Date()),
    status: ExpenseStatus.DRAFT,
    attachmentUrl: "",
    notes: "",
  };
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const selectClass = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

type Option = { id: string; name: string };

type ExpenseFormProps = {
  mode: "create" | "edit";
  expenseId?: string;
  defaultValues?: ExpenseFormInput;
  categories: Option[];
  vendors: Option[];
};

export function ExpenseForm({ mode, expenseId, defaultValues, categories, vendors }: ExpenseFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseFormFieldsSchema),
    defaultValues: defaultValues ?? buildDefaultExpenseValues(),
  });

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      if (mode === "create") {
        const res = await createExpenseAction(data);
        if (!res.ok) {
          form.setError("root", { message: res.error });
          return;
        }
        router.push(`/dashboard/expenses/${res.id}`);
        router.refresh();
        return;
      }

      if (!expenseId) {
        form.setError("root", { message: "Missing expense id" });
        return;
      }

      const res = await updateExpenseAction(expenseId, data);
      if (!res.ok) {
        form.setError("root", { message: res.error });
        return;
      }
      router.refresh();
    });
  });

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="border-b">
        <CardTitle>{mode === "create" ? "New expense" : "Edit expense"}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4 pt-4">
          {form.formState.errors.root?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          {categories.length === 0 ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Add at least one expense category in the database before recording expenses.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="expense-title">Title</Label>
              <Input id="expense-title" aria-invalid={!!form.formState.errors.title} {...form.register("title")} />
              {form.formState.errors.title?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                min={0}
                step="0.01"
                aria-invalid={!!form.formState.errors.amount}
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-date">Expense date</Label>
              <Input id="expense-date" type="date" aria-invalid={!!form.formState.errors.expenseDate} {...form.register("expenseDate")} />
              {form.formState.errors.expenseDate?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.expenseDate.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="expense-category">Category</Label>
              <select
                id="expense-category"
                className={selectClass}
                disabled={categories.length === 0}
                aria-invalid={!!form.formState.errors.categoryId}
                {...form.register("categoryId")}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.categoryId?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="expense-vendor">Vendor (optional)</Label>
              <select id="expense-vendor" className={selectClass} aria-invalid={!!form.formState.errors.vendorId} {...form.register("vendorId")}>
                <option value="">None</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-payment">Payment mode</Label>
              <select id="expense-payment" className={selectClass} {...form.register("paymentMode")}>
                {(Object.values(PaymentMode) as PaymentMode[]).map((m) => (
                  <option key={m} value={m}>
                    {formatEnumLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-status">Status</Label>
              <select id="expense-status" className={selectClass} {...form.register("status")}>
                {(Object.values(ExpenseStatus) as ExpenseStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {formatEnumLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="expense-invoice">Invoice number</Label>
              <Input id="expense-invoice" aria-invalid={!!form.formState.errors.invoiceNumber} {...form.register("invoiceNumber")} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="expense-attachment">Attachment URL</Label>
              <Input id="expense-attachment" type="text" placeholder="https://…" {...form.register("attachmentUrl")} />
              {form.formState.errors.attachmentUrl?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.attachmentUrl.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="expense-notes">Notes</Label>
              <Textarea id="expense-notes" rows={4} aria-invalid={!!form.formState.errors.notes} {...form.register("notes")} />
              {form.formState.errors.notes?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/expenses")} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || categories.length === 0}>
            {pending ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
