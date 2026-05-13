import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { META_ACCOUNT_CAMPAIGN_EXTERNAL_ID, META_AD_EXTERNAL_ID_PREFIX } from "@/modules/meta/lib/meta-ads-chart-types";
import type { MetaAdsCampaignChartRow, MetaAdsDailyPoint } from "@/modules/meta/lib/meta-ads-chart-types";
import {
  fetchAdAccountDailyInsights,
  fetchAdsWithInsights,
  fetchCampaignsWithInsights,
} from "@/modules/meta/server/meta-marketing";

export const campaignNotDeleted: Prisma.CampaignWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export const campaignMetricNotDeleted: Prisma.CampaignMetricWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseInsightDate(dateStart: string): Date {
  const [y, m, d] = dateStart.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

async function syncAccountDailyMetrics(daily: Awaited<ReturnType<typeof fetchAdAccountDailyInsights>>) {
  const accountCampaign = await prisma.campaign.upsert({
    where: { externalId: META_ACCOUNT_CAMPAIGN_EXTERNAL_ID },
    create: {
      externalId: META_ACCOUNT_CAMPAIGN_EXTERNAL_ID,
      name: "Account (daily)",
      status: "AGGREGATE",
      objective: "ACCOUNT_DAILY",
    },
    update: {
      name: "Account (daily)",
      status: "AGGREGATE",
    },
  });

  for (const day of daily) {
    if (!day.dateStart) continue;
    const metricDate = parseInsightDate(day.dateStart);

    await prisma.campaignMetric.upsert({
      where: {
        campaignId_date: {
          campaignId: accountCampaign.id,
          date: metricDate,
        },
      },
      create: {
        campaignId: accountCampaign.id,
        date: metricDate,
        spend: day.spend,
        impressions: day.impressions,
        clicks: day.clicks,
        leads: day.leadSubmissions,
        conversions: day.messagingConversations,
        raw: {
          reach: day.reach,
          messagingConversations: day.messagingConversations,
          leadSubmissions: day.leadSubmissions,
          dateStart: day.dateStart,
        },
      },
      update: {
        spend: day.spend,
        impressions: day.impressions,
        clicks: day.clicks,
        leads: day.leadSubmissions,
        conversions: day.messagingConversations,
        raw: {
          reach: day.reach,
          messagingConversations: day.messagingConversations,
          leadSubmissions: day.leadSubmissions,
          dateStart: day.dateStart,
        },
      },
    });
  }
}

export async function syncMetaCampaignsFromApi() {
  const token = undefined;
  const [{ accountSummary, campaigns }, daily, ads] = await Promise.all([
    fetchCampaignsWithInsights(token),
    fetchAdAccountDailyInsights(token),
    fetchAdsWithInsights(token),
  ]);
  const metricDate = startOfUtcDay();

  await syncAccountDailyMetrics(daily);

  for (const row of campaigns) {
    const campaign = await prisma.campaign.upsert({
      where: { externalId: row.id },
      create: {
        externalId: row.id,
        name: row.name,
        status: row.effective_status ?? row.status ?? null,
        objective: row.objective ?? null,
      },
      update: {
        name: row.name,
        status: row.effective_status ?? row.status ?? null,
        objective: row.objective ?? null,
      },
    });

    await prisma.campaignMetric.upsert({
      where: {
        campaignId_date: {
          campaignId: campaign.id,
          date: metricDate,
        },
      },
      create: {
        campaignId: campaign.id,
        date: metricDate,
        spend: row.insights.spend,
        impressions: row.insights.impressions,
        clicks: row.insights.clicks,
        leads: row.insights.leadSubmissions,
        conversions: row.insights.messagingConversations,
        raw: {
          reach: row.insights.reach,
          messagingConversations: row.insights.messagingConversations,
          leadSubmissions: row.insights.leadSubmissions,
          actions: row.insights.rawActions,
        },
      },
      update: {
        spend: row.insights.spend,
        impressions: row.insights.impressions,
        clicks: row.insights.clicks,
        leads: row.insights.leadSubmissions,
        conversions: row.insights.messagingConversations,
        raw: {
          reach: row.insights.reach,
          messagingConversations: row.insights.messagingConversations,
          leadSubmissions: row.insights.leadSubmissions,
          actions: row.insights.rawActions,
        },
      },
    });
  }

  for (const row of ads) {
    const externalId = `${META_AD_EXTERNAL_ID_PREFIX}${row.id}`;
    const campaign = await prisma.campaign.upsert({
      where: { externalId },
      create: {
        externalId,
        name: row.name,
        status: row.effective_status ?? row.status ?? null,
        objective: row.campaign?.name ?? null,
      },
      update: {
        name: row.name,
        status: row.effective_status ?? row.status ?? null,
        objective: row.campaign?.name ?? null,
      },
    });

    await prisma.campaignMetric.upsert({
      where: {
        campaignId_date: {
          campaignId: campaign.id,
          date: metricDate,
        },
      },
      create: {
        campaignId: campaign.id,
        date: metricDate,
        spend: row.insights.spend,
        impressions: row.insights.impressions,
        clicks: row.insights.clicks,
        leads: row.insights.leadSubmissions,
        conversions: row.insights.messagingConversations,
        raw: {
          reach: row.insights.reach,
          messagingConversations: row.insights.messagingConversations,
          leadSubmissions: row.insights.leadSubmissions,
          actions: row.insights.rawActions,
        },
      },
      update: {
        spend: row.insights.spend,
        impressions: row.insights.impressions,
        clicks: row.insights.clicks,
        leads: row.insights.leadSubmissions,
        conversions: row.insights.messagingConversations,
        raw: {
          reach: row.insights.reach,
          messagingConversations: row.insights.messagingConversations,
          leadSubmissions: row.insights.leadSubmissions,
          actions: row.insights.rawActions,
        },
      },
    });
  }

  return {
    syncedCampaigns: campaigns.length,
    syncedAds: ads.length,
    accountSummary,
    metricDate,
    dailyPoints: daily.length,
  };
}

export type CampaignDashboardRow = {
  id: string;
  externalId: string;
  name: string;
  status: string | null;
  objective: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  messagingConversations: number;
  leadSubmissions: number;
  metricDate: Date | null;
};

function readMetricNumber(raw: unknown, key: string): number {
  if (!raw || typeof raw !== "object") return 0;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

export async function listCampaignDashboardRows(): Promise<CampaignDashboardRow[]> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      AND: [
        campaignNotDeleted,
        { externalId: { not: META_ACCOUNT_CAMPAIGN_EXTERNAL_ID } },
        { NOT: { externalId: { startsWith: META_AD_EXTERNAL_ID_PREFIX } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      metrics: {
        where: campaignMetricNotDeleted,
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  return campaigns.map((campaign) => {
    const metric = campaign.metrics[0];
    const raw = metric?.raw;
    return {
      id: campaign.id,
      externalId: campaign.externalId,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      spend: metric?.spend ?? 0,
      impressions: metric?.impressions ?? 0,
      reach: readMetricNumber(raw, "reach"),
      clicks: metric?.clicks ?? 0,
      messagingConversations: metric?.conversions ?? readMetricNumber(raw, "messagingConversations"),
      leadSubmissions: metric?.leads ?? readMetricNumber(raw, "leadSubmissions"),
      metricDate: metric?.date ?? null,
    };
  });
}

export async function getCampaignDashboardTotals(rows: CampaignDashboardRow[]) {
  return rows.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      impressions: acc.impressions + row.impressions,
      reach: acc.reach + row.reach,
      clicks: acc.clicks + row.clicks,
      messagingConversations: acc.messagingConversations + row.messagingConversations,
      leadSubmissions: acc.leadSubmissions + row.leadSubmissions,
    }),
    {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      messagingConversations: 0,
      leadSubmissions: 0,
    },
  );
}

export async function getLatestCampaignSyncDate(): Promise<Date | null> {
  const latest = await prisma.campaignMetric.findFirst({
    where: campaignMetricNotDeleted,
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return latest?.date ?? null;
}

export async function getAccountDailyMetricsSeries(limitDays = 30): Promise<MetaAdsDailyPoint[]> {
  const account = await prisma.campaign.findFirst({
    where: { externalId: META_ACCOUNT_CAMPAIGN_EXTERNAL_ID },
    select: { id: true },
  });

  if (!account) return [];

  const metrics = await prisma.campaignMetric.findMany({
    where: { AND: [{ campaignId: account.id }, campaignMetricNotDeleted] },
    orderBy: { date: "desc" },
    take: limitDays,
    select: {
      date: true,
      spend: true,
      impressions: true,
      clicks: true,
      leads: true,
      conversions: true,
      raw: true,
    },
  });

  return metrics
    .slice()
    .reverse()
    .map((m) => {
    const raw = m.raw;
    const reach = readMetricNumber(raw, "reach");
    return {
      date: m.date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(m.date),
      spend: m.spend,
      reach,
      impressions: m.impressions ?? 0,
      clicks: m.clicks ?? 0,
      messagingConversations: m.conversions ?? readMetricNumber(raw, "messagingConversations"),
      leadSubmissions: m.leads ?? readMetricNumber(raw, "leadSubmissions"),
    };
  });
}

export function toCampaignChartRows(rows: CampaignDashboardRow[]): MetaAdsCampaignChartRow[] {
  return rows.map((row) => ({
    name: row.name,
    spend: row.spend,
    reach: row.reach,
    messagingConversations: row.messagingConversations,
    impressions: row.impressions,
    clicks: row.clicks,
    leadSubmissions: row.leadSubmissions,
  }));
}

export async function listAdChartRows(): Promise<MetaAdsCampaignChartRow[]> {
  const ads = await prisma.campaign.findMany({
    where: {
      AND: [campaignNotDeleted, { externalId: { startsWith: META_AD_EXTERNAL_ID_PREFIX } }],
    },
    orderBy: { name: "asc" },
    include: {
      metrics: {
        where: campaignMetricNotDeleted,
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  return ads.map((ad) => {
    const metric = ad.metrics[0];
    const raw = metric?.raw;
    return {
      name: ad.name,
      spend: metric?.spend ?? 0,
      reach: readMetricNumber(raw, "reach"),
      messagingConversations: metric?.conversions ?? readMetricNumber(raw, "messagingConversations"),
      impressions: metric?.impressions ?? 0,
      clicks: metric?.clicks ?? 0,
      leadSubmissions: metric?.leads ?? readMetricNumber(raw, "leadSubmissions"),
    };
  });
}
