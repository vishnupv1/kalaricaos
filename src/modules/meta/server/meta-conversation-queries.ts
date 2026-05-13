import type { MetaConversationPlatform, MetaConversationStatus, Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import {
  deriveMetaConversationStatus,
  fetchPageMessagingConversations,
  type MetaMessagingConversation,
} from "@/modules/meta/server/meta-messaging";
import { getResolvedMetaPageId } from "@/modules/meta/server/meta-sync-env";

export const metaConversationNotDeleted: Prisma.MetaConversationWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

async function upsertConversationMessages(
  conversationId: string,
  pageId: string,
  platform: MetaConversationPlatform | null,
  row: MetaMessagingConversation,
) {
  for (const message of row.messages) {
    await prisma.metaMessage.upsert({
      where: { externalId: message.externalId },
      create: {
        externalId: message.externalId,
        conversationId,
        pageId,
        platform,
        body: message.body,
        fromId: message.fromId,
        fromName: message.fromName,
        fromRole: message.fromRole,
        sentAt: message.sentAt,
        raw: message.raw as Prisma.InputJsonValue,
      },
      update: {
        conversationId,
        pageId,
        platform,
        body: message.body,
        fromId: message.fromId,
        fromName: message.fromName,
        fromRole: message.fromRole,
        sentAt: message.sentAt,
        raw: message.raw as Prisma.InputJsonValue,
      },
    });
  }
}

export async function syncMetaConversationsFromApi(limit = 50) {
  const pageId = getResolvedMetaPageId();
  const conversations = await fetchPageMessagingConversations(undefined, limit);
  const activeExternalIds = new Set<string>();

  for (const row of conversations) {
    activeExternalIds.add(row.id);
    const status = deriveMetaConversationStatus({
      unreadCount: row.unreadCount,
      lastMessageFrom: row.lastMessageFrom,
    });

    const saved = await prisma.metaConversation.upsert({
      where: { externalId: row.id },
      create: {
        externalId: row.id,
        pageId,
        platform: row.platform,
        participantId: row.participantId,
        participantName: row.participantName,
        status,
        unreadCount: row.unreadCount,
        snippet: row.snippet,
        lastMessageAt: row.lastMessageAt,
        lastMessageFrom: row.lastMessageFrom,
        adName: row.adName,
        raw: row.raw as Prisma.InputJsonValue,
      },
      update: {
        pageId,
        platform: row.platform,
        participantId: row.participantId,
        participantName: row.participantName,
        status,
        unreadCount: row.unreadCount,
        snippet: row.snippet,
        lastMessageAt: row.lastMessageAt,
        lastMessageFrom: row.lastMessageFrom,
        adName: row.adName,
        raw: row.raw as Prisma.InputJsonValue,
        deletedAt: null,
      },
    });

    await upsertConversationMessages(saved.id, pageId, row.platform, row);
  }

  const stale = await prisma.metaConversation.findMany({
    where: {
      AND: [metaConversationNotDeleted, { pageId, externalId: { notIn: [...activeExternalIds] } }],
    },
    select: { id: true },
  });

  for (const row of stale) {
    await prisma.metaConversation.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
  }

  return {
    synced: conversations.length,
    messenger: conversations.filter((row) => row.platform === "MESSENGER").length,
    instagram: conversations.filter((row) => row.platform === "INSTAGRAM").length,
    unread: conversations.filter((row) =>
      deriveMetaConversationStatus({
        unreadCount: row.unreadCount,
        lastMessageFrom: row.lastMessageFrom,
      }) === "UNREAD",
    ).length,
    read: conversations.filter((row) =>
      deriveMetaConversationStatus({
        unreadCount: row.unreadCount,
        lastMessageFrom: row.lastMessageFrom,
      }) === "READ",
    ).length,
    replied: conversations.filter((row) =>
      deriveMetaConversationStatus({
        unreadCount: row.unreadCount,
        lastMessageFrom: row.lastMessageFrom,
      }) === "REPLIED",
    ).length,
  };
}

export async function listMetaConversationRows(opts?: { status?: MetaConversationStatus }) {
  const and: Prisma.MetaConversationWhereInput[] = [metaConversationNotDeleted];

  if (opts?.status) {
    and.push({ status: opts.status });
  }

  return prisma.metaConversation.findMany({
    where: { AND: and },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      externalId: true,
      platform: true,
      participantName: true,
      status: true,
      unreadCount: true,
      snippet: true,
      lastMessageAt: true,
      lastMessageFrom: true,
      adName: true,
      updatedAt: true,
      messages: {
        orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
        take: 25,
        select: {
          id: true,
          body: true,
          fromRole: true,
          fromName: true,
          sentAt: true,
        },
      },
      _count: { select: { messages: true } },
    },
  });
}

export async function listMetaMessagesForConversation(conversationId: string) {
  return prisma.metaMessage.findMany({
    where: { conversationId },
    orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      body: true,
      fromRole: true,
      fromName: true,
      sentAt: true,
      platform: true,
    },
  });
}

export async function getMetaConversationStatusCounts() {
  const rows = await prisma.metaConversation.groupBy({
    by: ["status"],
    where: metaConversationNotDeleted,
    _count: { _all: true },
  });

  return {
    UNREAD: rows.find((row) => row.status === "UNREAD")?._count._all ?? 0,
    READ: rows.find((row) => row.status === "READ")?._count._all ?? 0,
    REPLIED: rows.find((row) => row.status === "REPLIED")?._count._all ?? 0,
    total: rows.reduce((sum, row) => sum + row._count._all, 0),
  };
}
