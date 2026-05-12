"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { expenseFormSchema } from "@/modules/expenses/lib/expense-schemas";
import { expenseNotDeleted } from "@/modules/expenses/server/expense-queries";
import { getModuleActionContext } from "@/server/auth/action-context";

export type ExpenseActionState = { ok: true; id: string } | { ok: false; error: string };

export async function createExpenseAction(raw: unknown): Promise<ExpenseActionState> {
  const ctx = await getModuleActionContext("expenses");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = expenseFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  const expense = await prisma.expense.create({
    data: {
      title: data.title,
      amount: data.amount,
      categoryId: data.categoryId,
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber,
      paymentMode: data.paymentMode,
      expenseDate: data.expenseDate,
      status: data.status,
      attachmentUrl: data.attachmentUrl,
      notes: data.notes,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/expenses");
  return { ok: true, id: expense.id };
}

export async function updateExpenseAction(id: string, raw: unknown): Promise<ExpenseActionState> {
  const ctx = await getModuleActionContext("expenses");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.expense.findFirst({ where: { AND: [{ id }, expenseNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Expense not found" };
  }

  const parsed = expenseFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  await prisma.expense.update({
    where: { id },
    data: {
      title: data.title,
      amount: data.amount,
      categoryId: data.categoryId,
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber,
      paymentMode: data.paymentMode,
      expenseDate: data.expenseDate,
      status: data.status,
      attachmentUrl: data.attachmentUrl,
      notes: data.notes,
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath(`/dashboard/expenses/${id}`);
  return { ok: true, id };
}

export async function softDeleteExpenseAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getModuleActionContext("expenses");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.expense.findFirst({ where: { AND: [{ id }, expenseNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Expense not found" };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath(`/dashboard/expenses/${id}`);
  return { ok: true };
}
