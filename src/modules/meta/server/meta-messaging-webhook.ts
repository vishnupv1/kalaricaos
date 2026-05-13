import type { MetaConversationPlatform, Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { deriveMetaConversationStatus } from "@/modules/meta/server/meta-messaging";
import { getResolvedMetaPageId } from "@/modules/meta/server/meta-sync-env";

export type MetaMessagingWebhookPayload = {
  object?: string;
  entry?: {
    id?: string;
    time?: number;
    messaging?: MetaMessagingWebhookEvent[];
  }[];
};

type MetaMessagingWebhookEvent = {
  sender?: { id?: string; name?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
  };
};

function normalizeId(id: string | undefined): string {
  return id?.replace(/\D/g, "") ?? "";
}

function threadExternalId(pageId: string, customerPsid: string) {
  return `thread:${pageId}:${customerPsid}`;
}

export async function processMetaMessagingWebhook(payload: MetaMessagingWebhookPayload) {
  const pageId = getResolvedMetaPageId();
  const normalizedPageId = normalizeId(pageId);
  let processed = 0;

  for (const entry of payload.entry ?? []) {
    const entryPageId = normalizeId(entry.id);
    if (entryPageId && entryPageId !== normalizedPageId) continue;

    for (const event of entry.messaging ?? []) {
      const messageId = event.message?.mid?.trim();
      const text = event.message?.text?.trim();
      if (!messageId) continue;

      const senderId = event.sender?.id ?? "";
      const recipientId = event.recipient?.id ?? "";
      const senderNorm = normalizeId(senderId);
      const isFromPage = senderNorm === normalizedPageId;
      const customerPsid = isFromPage ? recipientId : senderId;
      if (!customerPsid) continue;

      const sentAt = event.timestamp ? new Date(event.timestamp) : new Date();
      const fromRole = isFromPage ? "PAGE" : "USER";
      const platform: MetaConversationPlatform = "MESSENGER";

      let conversation = await prisma.metaConversation.findFirst({
        where: {
          OR: [
            { externalId: threadExternalId(pageId, customerPsid) },
            { pageId, participantId: customerPsid, deletedAt: null },
          ],
        },
      });

      if (!conversation) {
        conversation = await prisma.metaConversation.create({
          data: {
            externalId: threadExternalId(pageId, customerPsid),
            pageId,
            platform,
            participantId: customerPsid,
            participantName: isFromPage ? null : event.sender?.name?.trim() || null,
            status: "UNREAD",
            unreadCount: isFromPage ? 0 : 1,
            snippet: text ?? null,
            lastMessageAt: sentAt,
            lastMessageFrom: fromRole,
            raw: event as Prisma.InputJsonValue,
          },
        });
      } else {
        const status = deriveMetaConversationStatus({
          unreadCount: isFromPage ? 0 : 1,
          lastMessageFrom: fromRole as "PAGE" | "USER",
        });
        conversation = await prisma.metaConversation.update({
          where: { id: conversation.id },
          data: {
            platform,
            participantId: customerPsid,
            participantName: conversation.participantName ?? (isFromPage ? null : event.sender?.name?.trim() || null),
            status,
            unreadCount: isFromPage ? 0 : (conversation.unreadCount ?? 0) + 1,
            snippet: text ?? conversation.snippet,
            lastMessageAt: sentAt,
            lastMessageFrom: fromRole,
            deletedAt: null,
          },
        });
      }

      await prisma.metaMessage.upsert({
        where: { externalId: messageId },
        create: {
          externalId: messageId,
          conversationId: conversation.id,
          pageId,
          platform,
          body: text ?? null,
          fromId: isFromPage ? pageId : customerPsid,
          fromName: isFromPage ? null : event.sender?.name?.trim() || null,
          fromRole,
          sentAt,
          raw: event as Prisma.InputJsonValue,
        },
        update: {
          conversationId: conversation.id,
          body: text ?? null,
          fromRole,
          sentAt,
          raw: event as Prisma.InputJsonValue,
        },
      });

      processed += 1;
    }
  }

  return { processed };
}
