function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getMetaAppId(): string | undefined {
  return trimEnv("META_APP_ID");
}

export function getMetaAppSecret(): string | undefined {
  return trimEnv("META_APP_SECRET");
}

export function getMetaVerifyToken(): string | undefined {
  return trimEnv("META_VERIFY_TOKEN");
}

export function getMetaPageAccessToken(): string | undefined {
  return trimEnv("META_PAGE_ACCESS_TOKEN");
}

/** User or system token with `ads_read` for Marketing API / Insights (not the Page lead token). */
export function getMetaMarketingAccessToken(): string | undefined {
  return trimEnv("META_MARKETING_ACCESS_TOKEN") ?? trimEnv("META_PAGE_ACCESS_TOKEN");
}

export type MetaWebhookCredentials = {
  appSecret: string;
  verifyToken: string;
  pageAccessToken: string;
};

export function getMetaWebhookCredentials(): MetaWebhookCredentials | null {
  const appSecret = getMetaAppSecret();
  const verifyToken = getMetaVerifyToken();
  const pageAccessToken = getMetaPageAccessToken();
  if (!appSecret || !verifyToken || !pageAccessToken) {
    return null;
  }
  return { appSecret, verifyToken, pageAccessToken };
}
