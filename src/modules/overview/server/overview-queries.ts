import type { AppRole, LeadStage } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { expenseNotDeleted } from "@/modules/expenses/server/expense-queries";
import { getLeadStageCounts, leadNotDeleted } from "@/modules/leads/server/lead-queries";
import { getMetaLeadStats } from "@/modules/meta/server/meta-queries";
import {
  getCampaignDashboardTotals,
  getLatestCampaignSyncDate,
  listCampaignDashboardRows,
} from "@/modules/meta/server/campaign-queries";
import { productNotDeleted } from "@/modules/products/server/product-queries";
import { vendorNotDeleted } from "@/modules/vendors/server/vendor-queries";
import { canAccessModule } from "@/server/auth/rbac";

const orderNotDeleted = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

const inventoryMovementNotDeleted = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export type LeadOverviewStats = {
  total: number;
  stageCounts: Record<LeadStage, number>;
  activePipeline: number;
  won: number;
  metaLeads: number;
  latestMetaLeadName: string | null;
};

export type MarketingOverviewStats = {
  spend: number;
  reach: number;
  messagingConversations: number;
  leadSubmissions: number;
  campaignCount: number;
  lastSynced: Date | null;
};

export type CatalogOverviewStats = {
  productCount: number;
  vendorCount: number;
  lowStockCount: number;
  inventoryValue: number;
};

export type FinanceOverviewStats = {
  totalExpenses: number;
  pendingCount: number;
  pendingAmount: number;
  paidThisMonth: number;
};

export type OperationsOverviewStats = {
  orderCount: number;
  revenue: number;
  fulfilledCount: number;
  inventoryMovements30d: number;
};

export type BusinessOverview = {
  leads: LeadOverviewStats | null;
  marketing: MarketingOverviewStats | null;
  catalog: CatalogOverviewStats | null;
  finance: FinanceOverviewStats | null;
  operations: OperationsOverviewStats | null;
};

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function getLeadOverview(): Promise<LeadOverviewStats> {
  const [total, stageCounts, meta] = await Promise.all([
    prisma.lead.count({ where: leadNotDeleted }),
    getLeadStageCounts(),
    getMetaLeadStats(),
  ]);

  const activePipeline =
    stageCounts.NEW + stageCounts.CONTACTED + stageCounts.INTERESTED + stageCounts.NEGOTIATION;

  return {
    total,
    stageCounts,
    activePipeline,
    won: stageCounts.WON,
    metaLeads: meta.totalMetaLeads,
    latestMetaLeadName:
      meta.latestMetaLead?.fullName?.trim() || meta.latestMetaLead?.email?.trim() || null,
  };
}

async function getMarketingOverview(): Promise<MarketingOverviewStats> {
  const [rows, lastSynced] = await Promise.all([listCampaignDashboardRows(), getLatestCampaignSyncDate()]);
  const totals = await getCampaignDashboardTotals(rows);

  return {
    spend: totals.spend,
    reach: totals.reach,
    messagingConversations: totals.messagingConversations,
    leadSubmissions: totals.leadSubmissions,
    campaignCount: rows.length,
    lastSynced,
  };
}

async function getCatalogOverview(): Promise<CatalogOverviewStats> {
  const [productCount, vendorCount, products] = await Promise.all([
    prisma.product.count({ where: productNotDeleted }),
    prisma.vendor.count({ where: vendorNotDeleted }),
    prisma.product.findMany({
      where: productNotDeleted,
      select: { stockQuantity: true, costPrice: true, reorderThreshold: true },
    }),
  ]);

  let lowStockCount = 0;
  let inventoryValue = 0;

  for (const product of products) {
    inventoryValue += product.stockQuantity * product.costPrice;
    if (product.reorderThreshold > 0 && product.stockQuantity <= product.reorderThreshold) {
      lowStockCount += 1;
    }
  }

  return { productCount, vendorCount, lowStockCount, inventoryValue };
}

async function getFinanceOverview(): Promise<FinanceOverviewStats> {
  const monthStart = startOfMonth();

  const [totalExpenses, pendingAgg, paidAgg] = await Promise.all([
    prisma.expense.count({ where: expenseNotDeleted }),
    prisma.expense.aggregate({
      where: {
        AND: [
          expenseNotDeleted,
          { status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] } },
        ],
      },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        AND: [expenseNotDeleted, { status: "PAID" }, { expenseDate: { gte: monthStart } }],
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalExpenses,
    pendingCount: pendingAgg._count._all,
    pendingAmount: pendingAgg._sum.amount ?? 0,
    paidThisMonth: paidAgg._sum.amount ?? 0,
  };
}

async function getOperationsOverview(): Promise<OperationsOverviewStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [orderCount, revenueAgg, fulfilledCount, inventoryMovements30d] = await Promise.all([
    prisma.order.count({ where: orderNotDeleted }),
    prisma.order.aggregate({
      where: {
        AND: [orderNotDeleted, { status: { not: "CANCELLED" } }],
      },
      _sum: { grandTotal: true },
    }),
    prisma.order.count({
      where: {
        AND: [orderNotDeleted, { status: { in: ["FULFILLED", "SHIPPED", "DELIVERED"] } }],
      },
    }),
    prisma.inventoryMovement.count({
      where: {
        AND: [inventoryMovementNotDeleted, { createdAt: { gte: thirtyDaysAgo } }],
      },
    }),
  ]);

  return {
    orderCount,
    revenue: revenueAgg._sum?.grandTotal ?? 0,
    fulfilledCount,
    inventoryMovements30d,
  };
}

export async function getBusinessOverview(role: AppRole): Promise<BusinessOverview> {
  const tasks: Promise<void>[] = [];
  const overview: BusinessOverview = {
    leads: null,
    marketing: null,
    catalog: null,
    finance: null,
    operations: null,
  };

  if (canAccessModule(role, "leads")) {
    tasks.push(getLeadOverview().then((data) => { overview.leads = data; }));
  }

  if (canAccessModule(role, "meta")) {
    tasks.push(getMarketingOverview().then((data) => { overview.marketing = data; }));
  }

  if (canAccessModule(role, "products") || canAccessModule(role, "vendors") || canAccessModule(role, "inventory")) {
    tasks.push(getCatalogOverview().then((data) => { overview.catalog = data; }));
  }

  if (canAccessModule(role, "expenses")) {
    tasks.push(getFinanceOverview().then((data) => { overview.finance = data; }));
  }

  if (canAccessModule(role, "orders") || canAccessModule(role, "inventory")) {
    tasks.push(getOperationsOverview().then((data) => { overview.operations = data; }));
  }

  await Promise.all(tasks);
  return overview;
}
