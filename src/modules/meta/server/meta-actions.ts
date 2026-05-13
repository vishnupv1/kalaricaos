"use server";

import { revalidatePath } from "next/cache";

import { getMetaSyncHealth, type MetaSyncHealth } from "@/modules/meta/server/meta-graph";
import { getModuleActionContext } from "@/server/auth/action-context";

export type MetaTestConnectionState = { ok: true; health: MetaSyncHealth } | { ok: false; error: string };

export async function testMetaConnectionAction(): Promise<MetaTestConnectionState> {
  const ctx = await getModuleActionContext("meta");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const health = await getMetaSyncHealth();
  revalidatePath("/dashboard/meta");
  return { ok: true, health };
}
