import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { META_ACCOUNT_CAMPAIGN_EXTERNAL_ID, META_AD_EXTERNAL_ID_PREFIX } from "@/modules/meta/lib/meta-ads-chart-types";
import type { MetaAdWithInsights } from "@/modules/meta/server/meta-marketing";

const campaignNotDeleted: Prisma.CampaignWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export function normalizeMetaAdId(metaAdId: string): string {
  return metaAdId.trim().replace(/^ad:/i, "");
}

export function canonicalAdExternalId(metaAdId: string): string {
  return `${META_AD_EXTERNAL_ID_PREFIX}${normalizeMetaAdId(metaAdId)}`;
}

export function dedupeAdsByMetaId(ads: MetaAdWithInsights[]): MetaAdWithInsights[] {
  const byId = new Map<string, MetaAdWithInsights>();
  for (const ad of ads) {
    const id = normalizeMetaAdId(ad.id ?? "");
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, ad);
    }
  }
  return [...byId.values()];
}

function adExternalIdCandidates(metaAdId: string): string[] {
  const bare = normalizeMetaAdId(metaAdId);
  const canonical = canonicalAdExternalId(bare);
  return bare === canonical ? [canonical] : [canonical, bare];
}

async function softDeleteCampaign(id: string) {
  await prisma.campaign.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

async function findAdCampaignRows(metaAdId: string) {
  const candidates = adExternalIdCandidates(metaAdId);
  return prisma.campaign.findMany({
    where: {
      AND: [campaignNotDeleted, { externalId: { in: candidates } }],
    },
    orderBy: [{ externalId: "asc" }, { updatedAt: "desc" }],
  });
}

/** Merge legacy rows (bare Meta id vs `ad:` prefix) so re-sync does not create duplicates. */
export async function consolidateDuplicateAdCampaigns(metaAdId: string) {
  const rows = await findAdCampaignRows(metaAdId);
  if (rows.length <= 1) {
    return rows[0] ?? null;
  }

  const canonical = canonicalAdExternalId(metaAdId);
  let keeper = rows.find((row) => row.externalId === canonical) ?? rows[0]!;

  if (keeper.externalId !== canonical) {
    const conflict = await prisma.campaign.findFirst({
      where: { externalId: canonical },
      select: { id: true },
    });
    if (!conflict) {
      await prisma.campaign.update({
        where: { id: keeper.id },
        data: { externalId: canonical },
      });
    } else if (conflict.id !== keeper.id) {
      const preferred = rows.find((row) => row.id === conflict.id);
      if (preferred) {
        keeper = preferred;
      }
    }
  }

  for (const row of rows) {
    if (row.id !== keeper.id) {
      await softDeleteCampaign(row.id);
    }
  }

  return prisma.campaign.findFirst({
    where: { AND: [campaignNotDeleted, { id: keeper.id }] },
  });
}

type AdMetricPayload = {
  spend: number;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
  conversions: number | null;
  raw: Prisma.InputJsonValue;
};

async function upsertAdMetric(campaignId: string, metricDate: Date, payload: AdMetricPayload) {
  await prisma.campaignMetric.upsert({
    where: {
      campaignId_date: {
        campaignId,
        date: metricDate,
      },
    },
    create: {
      campaignId,
      date: metricDate,
      ...payload,
    },
    update: payload,
  });
}

export async function upsertSyncedAdCampaign(row: MetaAdWithInsights, metricDate: Date) {
  const metaAdId = normalizeMetaAdId(row.id);
  if (!metaAdId) {
    return null;
  }

  await consolidateDuplicateAdCampaigns(metaAdId);

  const externalId = canonicalAdExternalId(metaAdId);
  const metricPayload: AdMetricPayload = {
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
  };

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
      deletedAt: null,
    },
  });

  await upsertAdMetric(campaign.id, metricDate, metricPayload);
  return campaign;
}

export async function pruneStaleAdCampaigns(activeMetaAdIds: ReadonlySet<string>) {
  const stored = await prisma.campaign.findMany({
    where: {
      AND: [campaignNotDeleted, { externalId: { startsWith: META_AD_EXTERNAL_ID_PREFIX } }],
    },
    select: { id: true, externalId: true },
  });

  for (const row of stored) {
    const metaAdId = normalizeMetaAdId(row.externalId);
    if (!activeMetaAdIds.has(metaAdId)) {
      await softDeleteCampaign(row.id);
    }
  }
}

/** One-time cleanup each sync for legacy duplicate rows (e.g. bare Meta id vs `ad:` prefix). */
export async function reconcileAllAdCampaignDuplicates() {
  const prefixed = await prisma.campaign.findMany({
    where: {
      AND: [campaignNotDeleted, { externalId: { startsWith: META_AD_EXTERNAL_ID_PREFIX } }],
    },
    select: { externalId: true },
  });

  const seen = new Set<string>();
  for (const row of prefixed) {
    const metaAdId = normalizeMetaAdId(row.externalId);
    if (seen.has(metaAdId)) continue;
    seen.add(metaAdId);
    await consolidateDuplicateAdCampaigns(metaAdId);
  }

  const bareCandidates = await prisma.campaign.findMany({
    where: {
      AND: [
        campaignNotDeleted,
        { NOT: { externalId: { startsWith: META_AD_EXTERNAL_ID_PREFIX } } },
        { externalId: { not: META_ACCOUNT_CAMPAIGN_EXTERNAL_ID } },
      ],
    },
    select: { externalId: true },
  });

  for (const row of bareCandidates) {
    const hasPrefixedSibling = await prisma.campaign.findFirst({
      where: {
        AND: [campaignNotDeleted, { externalId: canonicalAdExternalId(row.externalId) }],
      },
      select: { id: true },
    });
    if (hasPrefixedSibling) {
      await consolidateDuplicateAdCampaigns(row.externalId);
    }
  }
}
