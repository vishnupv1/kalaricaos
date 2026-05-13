/** Synthetic campaign row for account-level daily Marketing API metrics. */
export const META_ACCOUNT_CAMPAIGN_EXTERNAL_ID = "__meta_account__";

/** Ads stored in Campaign table with this prefix on externalId. */
export const META_AD_EXTERNAL_ID_PREFIX = "ad:";

export type MetaAdsDailyPoint = {
  date: string;
  label: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  messagingConversations: number;
  leadSubmissions: number;
};

export type MetaAdsCampaignChartRow = {
  id: string;
  name: string;
  spend: number;
  reach: number;
  messagingConversations: number;
  impressions: number;
  clicks: number;
  leadSubmissions: number;
};
