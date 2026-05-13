import { graphGet } from "@/modules/meta/server/meta-graph";
import { getMetaPageAccessToken } from "@/modules/meta/server/meta-credentials";
import { getResolvedMetaPageId } from "@/modules/meta/server/meta-sync-env";
import {
  inspectMetaPageTokenScopes,
  resolveMetaPageAccessToken,
  tokenHasMessagingScope,
} from "@/modules/meta/server/meta-page-token-resolve";

const MESSAGING_SCOPES = ["pages_messaging"] as const;

export type MetaMessagingAccessHealth = {
  ok: boolean;
  tokenPresent: boolean;
  tokenType?: string;
  resolvedFromUserToken?: boolean;
  isValid?: boolean;
  scopes?: string[];
  hasMessagingScope: boolean;
  pageId: string;
  error?: string;
  remediation?: string[];
};

function buildRemediation(input: {
  hasMessagingScope: boolean;
  tokenType?: string;
  error?: string;
}): string[] {
  const steps = [
    "In Meta Developers → your app → App Review / Permissions, add pages_messaging (Advanced Access if the app is Live).",
    "Use a Facebook account that is Admin or Editor on your Facebook Page.",
    "Graph API Explorer: user token with pages_messaging + pages_show_list → GET me/accounts?fields=id,name,access_token → copy that Page access_token into META_PAGE_ACCESS_TOKEN (or keep the user token — Kalarica will exchange it automatically).",
    "For production, prefer Business Manager → System users with pages_messaging on the Page asset.",
    "After updating the token, restart the dev server and hard-refresh the browser.",
  ];

  if (input.tokenType && input.tokenType !== "PAGE") {
    return [
      `Env token type is "${input.tokenType}". Kalarica exchanges User tokens via me/accounts; if sync still fails, paste the Page access_token directly.`,
      ...steps,
    ];
  }

  if (!input.hasMessagingScope) {
    return ["pages_messaging is missing from this token's granted scopes.", ...steps];
  }

  if (input.error?.includes("Page Access Token") || input.error?.includes("(#190)")) {
    return [
      "Could not obtain a Page access token from me/accounts.",
      "Add pages_show_list to your user token, confirm Page Admin access, then retry — or paste the Page access_token from me/accounts into META_PAGE_ACCESS_TOKEN.",
    ];
  }

  if (input.error?.includes("appropriate role")) {
    return [
      "The Facebook user tied to this token does not have a Page role that can read Messenger.",
      "Open the Page in Meta Business Suite → Settings → Page access and confirm your user is Admin or Editor.",
      ...steps,
    ];
  }

  return steps;
}

export async function getMetaMessagingAccessHealth(): Promise<MetaMessagingAccessHealth> {
  const pageId = getResolvedMetaPageId();
  const envToken = getMetaPageAccessToken();

  if (!envToken) {
    return {
      ok: false,
      tokenPresent: false,
      hasMessagingScope: false,
      pageId,
      error: "META_PAGE_ACCESS_TOKEN is not set",
      remediation: buildRemediation({ hasMessagingScope: false }),
    };
  }

  try {
    const envDebug = await inspectMetaPageTokenScopes(envToken);
    const pageToken = await resolveMetaPageAccessToken(envToken);
    const resolvedFromUserToken = envDebug?.type === "USER";
    const pageDebug = pageToken === envToken ? envDebug : await inspectMetaPageTokenScopes(pageToken);
    const scopes = pageDebug?.scopes ?? envDebug?.scopes ?? [];
    const hasMessagingScope =
      (pageDebug ? tokenHasMessagingScope(pageDebug) : false) ||
      MESSAGING_SCOPES.every((scope) => scopes.includes(scope)) ||
      (envDebug?.granular_scopes?.some((row) => row.scope === "pages_messaging") ?? false);

    if (pageDebug && !pageDebug.is_valid) {
      return {
        ok: false,
        tokenPresent: true,
        tokenType: pageDebug.type ?? envDebug?.type,
        resolvedFromUserToken,
        isValid: false,
        scopes,
        hasMessagingScope,
        pageId,
        error: pageDebug.error?.message ?? "Page access token is not valid",
        remediation: buildRemediation({ hasMessagingScope, tokenType: envDebug?.type }),
      };
    }

    if (!hasMessagingScope) {
      return {
        ok: false,
        tokenPresent: true,
        tokenType: pageDebug?.type ?? envDebug?.type,
        resolvedFromUserToken,
        isValid: pageDebug?.is_valid ?? envDebug?.is_valid,
        scopes,
        hasMessagingScope: false,
        pageId,
        error: "pages_messaging is not granted on this Page access token.",
        remediation: buildRemediation({ hasMessagingScope: false, tokenType: envDebug?.type }),
      };
    }

    await graphGet<{ data?: unknown[] }>(`${pageId}/conversations?fields=id&limit=1`, pageToken);

    return {
      ok: true,
      tokenPresent: true,
      tokenType: pageDebug?.type ?? "PAGE",
      resolvedFromUserToken,
      isValid: pageDebug?.is_valid ?? true,
      scopes,
      hasMessagingScope: true,
      pageId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Messenger access check failed";
    const needsPageToken = message.includes("Page Access Token") || message.includes("(#190)");
    const hasMessagingScope = needsPageToken ? true : !message.includes("pages_messaging");

    return {
      ok: false,
      tokenPresent: true,
      hasMessagingScope,
      pageId,
      error: formatMetaMessagingError(message),
      remediation: buildRemediation({
        hasMessagingScope,
        tokenType: needsPageToken ? "USER" : undefined,
        error: message,
      }),
    };
  }
}

export function formatMetaMessagingError(error: string): string {
  if (error.includes("Page Access Token") || error.includes("(#190)")) {
    return `${error} Add pages_show_list to your user token so Kalarica can resolve the Page token via me/accounts.`;
  }
  if (error.includes("pages_messaging") || error.includes("appropriate role")) {
    return `${error} Regenerate the token with pages_messaging using a Facebook user who is Admin/Editor on the Page.`;
  }
  return error;
}

export async function assertMetaPageAccessTokenForMessaging(accessToken: string) {
  const pageToken = await resolveMetaPageAccessToken(accessToken);
  const debug = await inspectMetaPageTokenScopes(pageToken);

  if (debug && !debug.is_valid) {
    throw new Error(debug.error?.message ?? "Page access token is not valid");
  }

  if (debug && !tokenHasMessagingScope(debug)) {
    throw new Error(formatMetaMessagingError("pages_messaging is not granted on this token."));
  }

  return pageToken;
}
