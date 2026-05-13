import { graphGet } from "@/modules/meta/server/meta-graph";
import {
  assertMetaPageAccessTokenForMessaging,
  formatMetaMessagingError,
} from "@/modules/meta/server/meta-messaging-health";
import { resolveMetaPageAccessToken } from "@/modules/meta/server/meta-page-token-resolve";
import { getResolvedMetaPageId } from "@/modules/meta/server/meta-sync-env";

export type MetaConversationPlatform = "MESSENGER" | "INSTAGRAM";

type GraphParticipant = {
  id?: string;
  name?: string;
  email?: string;
};

type GraphMessage = {
  id?: string;
  message?: string;
  created_time?: string;
  from?: GraphParticipant;
};

type GraphConversation = {
  id: string;
  updated_time?: string;
  snippet?: string;
  unread_count?: number;
  participants?: { data?: GraphParticipant[] };
  messages?: { data?: GraphMessage[] };
};

type GraphConversationList = {
  data?: GraphConversation[];
  paging?: { next?: string };
};

export type MetaMessagingMessage = {
  externalId: string;
  body: string | null;
  fromId: string | null;
  fromName: string | null;
  fromRole: "PAGE" | "USER" | null;
  sentAt: Date | null;
  raw: GraphMessage;
};

export type MetaMessagingConversation = {
  id: string;
  platform: MetaConversationPlatform;
  updatedTime: Date | null;
  snippet: string | null;
  unreadCount: number;
  participantId: string | null;
  participantName: string | null;
  lastMessageAt: Date | null;
  lastMessageFrom: "PAGE" | "USER" | null;
  lastMessageText: string | null;
  adName: string | null;
  messages: MetaMessagingMessage[];
  raw: GraphConversation;
};

const conversationFields = [
  "id",
  "updated_time",
  "snippet",
  "unread_count",
  "participants",
  "messages.limit(25){id,message,created_time,from}",
].join(",");

function parseGraphTime(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickCustomerParticipant(
  participants: GraphParticipant[] | undefined,
  pageId: string,
): GraphParticipant | null {
  if (!participants?.length) return null;
  const normalizedPageId = pageId.replace(/\D/g, "");
  return (
    participants.find((participant) => {
      const id = participant.id?.replace(/\D/g, "") ?? "";
      return id && id !== normalizedPageId;
    }) ?? participants[0] ?? null
  );
}

function pickLatestMessage(messages: GraphMessage[] | undefined): GraphMessage | null {
  if (!messages?.length) return null;
  return [...messages].sort((a, b) => {
    const aTime = parseGraphTime(a.created_time)?.getTime() ?? 0;
    const bTime = parseGraphTime(b.created_time)?.getTime() ?? 0;
    return bTime - aTime;
  })[0] ?? null;
}

function messageFromRole(
  message: GraphMessage | null,
  pageId: string,
): "PAGE" | "USER" | null {
  if (!message?.from?.id) return null;
  const fromId = message.from.id.replace(/\D/g, "");
  const normalizedPageId = pageId.replace(/\D/g, "");
  return fromId === normalizedPageId ? "PAGE" : "USER";
}

function extractAdName(messages: GraphMessage[] | undefined): string | null {
  for (const message of messages ?? []) {
    const text = message.message ?? "";
    const match = text.match(/(?:sent an attachment|clicked an ad|ad:)\s*[—-]?\s*(.+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function mapMessages(
  messages: GraphMessage[] | undefined,
  pageId: string,
): MetaMessagingMessage[] {
  return (messages ?? [])
    .filter((row) => row.id)
    .map((row) => ({
      externalId: row.id!,
      body: row.message?.trim() || null,
      fromId: row.from?.id ?? null,
      fromName: row.from?.name?.trim() || row.from?.email?.trim() || null,
      fromRole: messageFromRole(row, pageId),
      sentAt: parseGraphTime(row.created_time),
      raw: row,
    }))
    .sort((a, b) => (a.sentAt?.getTime() ?? 0) - (b.sentAt?.getTime() ?? 0));
}

function mapConversation(
  row: GraphConversation,
  pageId: string,
  platform: MetaConversationPlatform,
): MetaMessagingConversation {
  const participants = row.participants?.data ?? [];
  const messages = row.messages?.data ?? [];
  const customer = pickCustomerParticipant(participants, pageId);
  const latestMessage = pickLatestMessage(messages);
  const lastMessageFrom = messageFromRole(latestMessage, pageId);
  const mappedMessages = mapMessages(messages, pageId);

  return {
    id: row.id,
    platform,
    updatedTime: parseGraphTime(row.updated_time),
    snippet: row.snippet?.trim() || latestMessage?.message?.trim() || null,
    unreadCount: typeof row.unread_count === "number" ? row.unread_count : 0,
    participantId: customer?.id ?? null,
    participantName: customer?.name?.trim() || customer?.email?.trim() || null,
    lastMessageAt: parseGraphTime(latestMessage?.created_time) ?? parseGraphTime(row.updated_time),
    lastMessageFrom,
    lastMessageText: latestMessage?.message?.trim() || null,
    adName: extractAdName(messages),
    messages: mappedMessages,
    raw: row,
  };
}

async function fetchConversationPage(
  pathOrUrl: string,
  accessToken: string,
): Promise<GraphConversationList> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const url = new URL(pathOrUrl);
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const body = (await res.json()) as GraphConversationList & { error?: { message?: string } };
    if (!res.ok) {
      throw new Error(formatMetaMessagingError(body.error?.message ?? `Graph API ${res.status}`));
    }
    return body;
  }
  return graphGet<GraphConversationList>(pathOrUrl, accessToken);
}

async function fetchPlatformConversations(
  pageId: string,
  pageToken: string,
  platform: MetaConversationPlatform,
  limit: number,
): Promise<MetaMessagingConversation[]> {
  let path = `${pageId}/conversations?platform=${platform.toLowerCase()}&fields=${encodeURIComponent(conversationFields)}&limit=${Math.min(limit, 50)}`;
  const results: MetaMessagingConversation[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < 5; page += 1) {
    try {
      const response = await fetchConversationPage(path, pageToken);
      for (const row of response.data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        results.push(mapConversation(row, pageId, platform));
      }

      const next = response.paging?.next;
      if (!next || results.length >= limit) break;
      path = next;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (platform === "INSTAGRAM" && (message.includes("instagram") || message.includes("permission"))) {
        return results;
      }
      throw e;
    }
  }

  return results.slice(0, limit);
}

export async function fetchPageInstagramBusinessAccountId(
  pageId: string,
  pageToken: string,
): Promise<string | null> {
  try {
    const page = await graphGet<{ instagram_business_account?: { id?: string } }>(
      `${pageId}?fields=instagram_business_account`,
      pageToken,
    );
    return page.instagram_business_account?.id?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchPageMessagingConversations(
  accessToken?: string,
  limit = 50,
): Promise<MetaMessagingConversation[]> {
  const token = accessToken ?? (await resolveMetaPageAccessToken());
  if (!token) {
    throw new Error("META_PAGE_ACCESS_TOKEN is not set");
  }

  const pageToken = await assertMetaPageAccessTokenForMessaging(token);
  const pageId = getResolvedMetaPageId();
  const perPlatform = Math.ceil(limit / 2);

  const [messenger, instagram] = await Promise.all([
    fetchPlatformConversations(pageId, pageToken, "MESSENGER", perPlatform),
    fetchPlatformConversations(pageId, pageToken, "INSTAGRAM", perPlatform),
  ]);

  const merged = [...messenger, ...instagram].sort((a, b) => {
    const aTime = a.lastMessageAt?.getTime() ?? a.updatedTime?.getTime() ?? 0;
    const bTime = b.lastMessageAt?.getTime() ?? b.updatedTime?.getTime() ?? 0;
    return bTime - aTime;
  });

  return merged.slice(0, limit);
}

export function deriveMetaConversationStatus(input: {
  unreadCount: number;
  lastMessageFrom: "PAGE" | "USER" | null;
}): "UNREAD" | "READ" | "REPLIED" {
  if (input.lastMessageFrom === "PAGE") {
    return "REPLIED";
  }
  if (input.unreadCount > 0) {
    return "UNREAD";
  }
  if (input.lastMessageFrom === "USER") {
    return "READ";
  }
  return "READ";
}
