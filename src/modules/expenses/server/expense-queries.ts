import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { vendorNotDeleted } from "@/modules/vendors/server/vendor-queries";

const defaultPageSize = 20;

export const expenseNotDeleted: Prisma.ExpenseWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export const expenseCategoryNotDeleted: Prisma.ExpenseCategoryWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function buildExpenseListWhere(search?: string): Prisma.ExpenseWhereInput {
  const q = search?.trim();
  if (!q) {
    return expenseNotDeleted;
  }
  return {
    AND: [
      expenseNotDeleted,
      {
        OR: [
          { title: { contains: q } },
          { invoiceNumber: { contains: q } },
          { notes: { contains: q } },
        ],
      },
    ],
  };
}

export async function listExpenses(opts: { search?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? defaultPageSize));
  const skip = (page - 1) * pageSize;
  const q = opts.search?.trim();
  const where = buildExpenseListWhere(q);

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        amount: true,
        expenseDate: true,
        status: true,
        paymentMode: true,
        updatedAt: true,
        category: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getExpenseById(id: string) {
  return prisma.expense.findFirst({
    where: { AND: [{ id }, expenseNotDeleted] },
    include: {
      category: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
    },
  });
}

export async function listExpenseCategoriesForSelect() {
  return prisma.expenseCategory.findMany({
    where: expenseCategoryNotDeleted,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function listVendorsForExpenseForm() {
  return prisma.vendor.findMany({
    where: vendorNotDeleted,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
