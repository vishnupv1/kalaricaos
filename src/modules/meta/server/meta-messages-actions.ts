"use server";

import { revalidatePath } from "next/cache";

import { syncMetaConversationsFromApi } from "@/modules/meta/server/meta-conversation-queries";
import { getModuleActionContext } from "@/server/auth/action-context";

export type MetaSyncMessagesState =
  | { ok: true; synced: number; messenger: number; instagram: number; unread: number; read: number; replied: number }
  | { ok: false; error: string };

export async function syncMetaMessagesAction(): Promise<MetaSyncMessagesState> {
  const ctx = await getModuleActionContext("meta");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const result = await syncMetaConversationsFromApi();
    revalidatePath("/dashboard/meta/messages");
    revalidatePath("/dashboard/meta");
    revalidatePath("/dashboard");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to sync messages from Meta" };
  }
}
