import { prisma } from "@/lib/prisma";
import { fetchMetaLead, mapMetaLeadToLeadFields } from "@/modules/meta/server/meta-graph";
import { getMetaPageAccessToken } from "@/modules/meta/server/meta-credentials";

export type MetaLeadSyncResult =
  | { ok: true; leadId: string; metaLeadId: string; created: boolean }
  | { ok: false; metaLeadId: string; error: string };

export async function upsertLeadFromMetaLeadgenId(
  metaLeadId: string,
  accessToken?: string,
): Promise<MetaLeadSyncResult> {
  const token = accessToken ?? getMetaPageAccessToken();
  if (!token) {
    return { ok: false, metaLeadId, error: "META_PAGE_ACCESS_TOKEN is not set" };
  }

  try {
    const graphLead = await fetchMetaLead(metaLeadId, token);
    const mapped = mapMetaLeadToLeadFields(graphLead);

    const existing = await prisma.lead.findFirst({
      where: { metaLeadId: mapped.metaLeadId },
      select: { id: true },
    });

    const lead = await prisma.lead.upsert({
      where: { metaLeadId: mapped.metaLeadId },
      create: {
        metaLeadId: mapped.metaLeadId,
        fullName: mapped.fullName,
        email: mapped.email,
        phone: mapped.phone,
        source: mapped.source,
        stage: "NEW",
      },
      update: {
        fullName: mapped.fullName ?? undefined,
        email: mapped.email ?? undefined,
        phone: mapped.phone ?? undefined,
        source: mapped.source,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: existing ? "meta_webhook_update" : "meta_webhook_create",
        body: existing ? "Lead updated from Meta Lead Ads webhook." : "Lead created from Meta Lead Ads webhook.",
        metadata: {
          metaLeadId: mapped.metaLeadId,
          createdTime: mapped.createdTime,
          fields: mapped.fieldSnapshot,
        },
      },
    });

    return { ok: true, leadId: lead.id, metaLeadId: mapped.metaLeadId, created: !existing };
  } catch (e) {
    return {
      ok: false,
      metaLeadId,
      error: e instanceof Error ? e.message : "Failed to sync Meta lead",
    };
  }
}

export async function processMetaLeadgenWebhookLeadIds(leadgenIds: string[]): Promise<MetaLeadSyncResult[]> {
  const results: MetaLeadSyncResult[] = [];
  for (const metaLeadId of leadgenIds) {
    results.push(await upsertLeadFromMetaLeadgenId(metaLeadId));
  }
  return results;
}
