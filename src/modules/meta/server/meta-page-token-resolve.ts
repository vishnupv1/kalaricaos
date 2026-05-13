import { getMetaAppId, getMetaAppSecret, getMetaPageAccessToken } from "@/modules/meta/server/meta-credentials";
import { graphGet } from "@/modules/meta/server/meta-graph";
import { getResolvedMetaPageId } from "@/modules/meta/server/meta-sync-env";

type DebugTokenResponse = {
  data?: {
    type?: string;
    is_valid?: boolean;
    scopes?: string[];
    granular_scopes?: { scope?: string; target_ids?: string[] }[];
    error?: { message?: string };
  };
};

type PageAccountsResponse = {
  data?: { id: string; name?: string; access_token?: string }[];
};

let cachedResolved: { raw: string; pageToken: string } | null = null;

function normalizeMetaId(id: string): string {
  return id.replace(/\D/g, "");
}

export async function inspectMetaPageTokenScopes(accessToken: string) {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  if (!appId || !appSecret) {
    return null;
  }

  const appAccessToken = `${appId}|${appSecret}`;
  const response = await graphGet<DebugTokenResponse>(
    `debug_token?input_token=${encodeURIComponent(accessToken)}`,
    appAccessToken,
  );

  return response.data ?? null;
}

export async function exchangeUserTokenForPageToken(userToken: string, pageId: string): Promise<string> {
  const response = await graphGet<PageAccountsResponse>(
    "me/accounts?fields=id,name,access_token&limit=100",
    userToken,
  );

  const targetId = normalizeMetaId(pageId);
  const page = response.data?.find((row) => normalizeMetaId(row.id) === targetId);

  if (!page?.access_token) {
    throw new Error(
      `Could not resolve a Page access token for page ${pageId}. Add pages_show_list to your user token and confirm you are Admin on that Page, or paste the Page access_token from me/accounts directly into META_PAGE_ACCESS_TOKEN.`,
    );
  }

  return page.access_token;
}

/** Returns a Page access token, exchanging a User token from META_PAGE_ACCESS_TOKEN when needed. */
export async function resolveMetaPageAccessToken(accessTokenOverride?: string): Promise<string> {
  const raw = accessTokenOverride ?? getMetaPageAccessToken();
  if (!raw) {
    throw new Error("META_PAGE_ACCESS_TOKEN is not set");
  }

  if (cachedResolved?.raw === raw) {
    return cachedResolved.pageToken;
  }

  const debug = await inspectMetaPageTokenScopes(raw);
  if (debug?.type === "PAGE") {
    cachedResolved = { raw, pageToken: raw };
    return raw;
  }

  if (debug?.type === "USER") {
    const pageToken = await exchangeUserTokenForPageToken(raw, getResolvedMetaPageId());
    cachedResolved = { raw, pageToken };
    return pageToken;
  }

  // debug unavailable: try exchange; fall back to raw if accounts call fails
  try {
    const pageToken = await exchangeUserTokenForPageToken(raw, getResolvedMetaPageId());
    cachedResolved = { raw, pageToken };
    return pageToken;
  } catch {
    cachedResolved = { raw, pageToken: raw };
    return raw;
  }
}

export function tokenHasMessagingScope(debug: NonNullable<Awaited<ReturnType<typeof inspectMetaPageTokenScopes>>>) {
  const scopes = debug.scopes ?? [];
  return (
    scopes.includes("pages_messaging") ||
    (debug.granular_scopes?.some((row) => row.scope === "pages_messaging") ?? false)
  );
}
