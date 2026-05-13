import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { fetchCampaignsWithInsights } from "@/modules/meta/server/meta-marketing";

export const campaignNotDeleted: Prisma.CampaignWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export const campaignMetricNotDeleted: Prisma.CampaignMetricWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function syncMetaCampaignsFromApi() {
  const { accountSummary, campaigns } = await fetchCampaignsWithInsights();
  const metricDate = startOfUtcDay();

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

  return {
    syncedCampaigns: campaigns.length,
    accountSummary,
    metricDate,
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
    where: campaignNotDeleted,
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
