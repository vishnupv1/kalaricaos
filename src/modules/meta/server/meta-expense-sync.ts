import { prisma } from "@/lib/prisma";
import { expenseCategoryNotDeleted, expenseNotDeleted } from "@/modules/expenses/server/expense-queries";
import type { MetaDailyInsightPoint } from "@/modules/meta/server/meta-marketing";

export const META_ADS_EXPENSE_INVOICE_PREFIX = "meta-ads-spend:";

const MARKETING_CATEGORY_SLUG = "marketing";

function metaAdsExpenseInvoice(dateStart: string) {
  return `${META_ADS_EXPENSE_INVOICE_PREFIX}${dateStart}`;
}

function expenseDateFromDateStart(dateStart: string) {
  return new Date(`${dateStart}T12:00:00`);
}

function expenseTitleForDate(dateStart: string) {
  const [y, m, d] = dateStart.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const label = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  return `Meta ads · ${label}`;
}

async function getMarketingCategoryId() {
  const category = await prisma.expenseCategory.findFirst({
    where: { AND: [expenseCategoryNotDeleted, { slug: MARKETING_CATEGORY_SLUG }] },
    select: { id: true },
  });

  if (!category) {
    throw new Error(
      `Expense category "${MARKETING_CATEGORY_SLUG}" not found. Run database seed to create marketing categories.`,
    );
  }

  return category.id;
}

export async function syncMetaAdSpendToExpenses(daily: MetaDailyInsightPoint[]) {
  const categoryId = await getMarketingCategoryId();
  let syncedExpenses = 0;

  for (const day of daily) {
    if (!day.dateStart) continue;

    const invoiceNumber = metaAdsExpenseInvoice(day.dateStart);
    const amount = Math.round(day.spend * 100) / 100;
    const expenseDate = expenseDateFromDateStart(day.dateStart);
    const title = expenseTitleForDate(day.dateStart);

    const existing = await prisma.expense.findFirst({
      where: { AND: [expenseNotDeleted, { invoiceNumber }] },
      select: { id: true },
    });

    if (amount <= 0) {
      if (existing) {
        await prisma.expense.update({
          where: { id: existing.id },
          data: { amount: 0, title, expenseDate },
        });
        syncedExpenses += 1;
      }
      continue;
    }

    if (existing) {
      await prisma.expense.update({
        where: { id: existing.id },
        data: {
          title,
          amount,
          categoryId,
          expenseDate,
          status: "PAID",
          paymentMode: "OTHER",
          notes: "Auto-synced from Meta Marketing API (daily ad account spend).",
        },
      });
    } else {
      await prisma.expense.create({
        data: {
          title,
          amount,
          categoryId,
          expenseDate,
          invoiceNumber,
          status: "PAID",
          paymentMode: "OTHER",
          notes: "Auto-synced from Meta Marketing API (daily ad account spend).",
        },
      });
    }

    syncedExpenses += 1;
  }

  return { syncedExpenses };
}
