import {
  KALARICA_META_AD_ACCOUNT_ID_NUMERIC,
  KALARICA_META_PAGE_ID,
  toActAdAccountId,
} from "@/modules/meta/lib/kalarica-meta-assets";

/** Server-only: which Meta-related env vars are present (never expose values). */
export type MetaSyncEnvStatus = {
  appId: boolean;
  appSecret: boolean;
  verifyToken: boolean;
  pageAccessToken: boolean;
};

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Facebook Page id for Lead Ads / webhooks (env or Kalarica default). */
export function getResolvedMetaPageId(): string {
  const fromEnv = process.env.META_PAGE_ID?.trim();
  return isNonEmpty(fromEnv) ? fromEnv! : KALARICA_META_PAGE_ID;
}

/** Marketing API ad account id `act_<digits>` (env or Kalarica default). */
export function getResolvedMetaAdAccountAct(): string {
  const fromEnv = process.env.META_AD_ACCOUNT_ID?.trim();
  if (isNonEmpty(fromEnv)) {
    return toActAdAccountId(fromEnv!);
  }
  return toActAdAccountId(KALARICA_META_AD_ACCOUNT_ID_NUMERIC);
}

export function getResolvedMetaAdAccountNumeric(): string {
  return getResolvedMetaAdAccountAct().replace(/^act_/i, "");
}

export function getMetaSyncEnvStatus(): MetaSyncEnvStatus {
  return {
    appId: isNonEmpty(process.env.META_APP_ID),
    appSecret: isNonEmpty(process.env.META_APP_SECRET),
    verifyToken: isNonEmpty(process.env.META_VERIFY_TOKEN),
    pageAccessToken: isNonEmpty(process.env.META_PAGE_ACCESS_TOKEN),
  };
}

export function getMetaAssetSource(): { pageFromEnv: boolean; adAccountFromEnv: boolean } {
  return {
    pageFromEnv: isNonEmpty(process.env.META_PAGE_ID),
    adAccountFromEnv: isNonEmpty(process.env.META_AD_ACCOUNT_ID),
  };
}

export function getMetaWebhookCallbackUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/api/webhooks/meta/leadgen`;
}
