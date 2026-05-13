"use server";

import { revalidatePath } from "next/cache";

import { getMetaSyncHealth, type MetaSyncHealth } from "@/modules/meta/server/meta-graph";
import { syncMetaCampaignsFromApi } from "@/modules/meta/server/campaign-queries";
import { getModuleActionContext } from "@/server/auth/action-context";

export type MetaTestConnectionState = { ok: true; health: MetaSyncHealth } | { ok: false; error: string };

export type MetaSyncAdsState =
  | { ok: true; syncedCampaigns: number }
  | { ok: false; error: string };

export async function testMetaConnectionAction(): Promise<MetaTestConnectionState> {
  const ctx = await getModuleActionContext("meta");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const health = await getMetaSyncHealth();
  revalidatePath("/dashboard/meta");
  return { ok: true, health };
}

export async function syncMetaAdsAction(): Promise<MetaSyncAdsState> {
  const ctx = await getModuleActionContext("meta");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const result = await syncMetaCampaignsFromApi();
    revalidatePath("/dashboard/meta/ads");
    revalidatePath("/dashboard/meta");
    return { ok: true, syncedCampaigns: result.syncedCampaigns };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to sync ads from Meta" };
  }
}
