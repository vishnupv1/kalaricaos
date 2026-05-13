import { aggregateParsedInsights, parseMetaInsightRow, type ParsedMetaInsights } from "@/modules/meta/lib/meta-insights";
import { graphGet } from "@/modules/meta/server/meta-graph";
import { getMetaMarketingAccessToken } from "@/modules/meta/server/meta-credentials";
import { getResolvedMetaAdAccountAct } from "@/modules/meta/server/meta-sync-env";

type Paged<T> = { data?: T[]; paging?: { next?: string } };

export type MetaCampaignRow = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
};

export type MetaCampaignWithInsights = MetaCampaignRow & {
  insights: ParsedMetaInsights;
};

const campaignFields = "id,name,status,effective_status,objective";
const insightFields = "spend,impressions,reach,clicks,cpc,cpm,ctr,actions,cost_per_action_type";

async function fetchAllPages<T>(firstPath: string, accessToken: string): Promise<T[]> {
  const page = await graphGet<Paged<T>>(firstPath, accessToken);
  return page.data ?? [];
}

export async function fetchAdAccountCampaigns(accessToken?: string): Promise<MetaCampaignRow[]> {
  const token = accessToken ?? getMetaMarketingAccessToken();
  if (!token) {
    throw new Error("META_MARKETING_ACCESS_TOKEN is not set");
  }

  const act = getResolvedMetaAdAccountAct();
  return fetchAllPages<MetaCampaignRow>(`${act}/campaigns?fields=${campaignFields}&limit=100`, token);
}

async function fetchCampaignInsights(
  campaignId: string,
  accessToken: string,
  datePreset = "last_30d",
): Promise<ParsedMetaInsights> {
  const rows = await graphGet<{ data?: Record<string, unknown>[] }>(
    `${campaignId}/insights?fields=${insightFields}&date_preset=${datePreset}`,
    accessToken,
  );

  const parsed = (rows.data ?? []).map((row) => parseMetaInsightRow(row as Parameters<typeof parseMetaInsightRow>[0]));
  return parsed.length > 0 ? aggregateParsedInsights(parsed) : parseMetaInsightRow({});
}

export async function fetchAdAccountInsightsSummary(
  accessToken?: string,
  datePreset = "last_30d",
): Promise<ParsedMetaInsights> {
  const token = accessToken ?? getMetaMarketingAccessToken();
  if (!token) {
    throw new Error("META_MARKETING_ACCESS_TOKEN is not set");
  }

  const act = getResolvedMetaAdAccountAct();
  const rows = await graphGet<{ data?: Record<string, unknown>[] }>(
    `${act}/insights?fields=${insightFields}&date_preset=${datePreset}`,
    token,
  );

  const parsed = (rows.data ?? []).map((row) => parseMetaInsightRow(row as Parameters<typeof parseMetaInsightRow>[0]));
  return parsed.length > 0 ? aggregateParsedInsights(parsed) : parseMetaInsightRow({});
}

export async function fetchCampaignsWithInsights(accessToken?: string): Promise<{
  accountSummary: ParsedMetaInsights;
  campaigns: MetaCampaignWithInsights[];
}> {
  const token = accessToken ?? getMetaMarketingAccessToken();
  if (!token) {
    throw new Error("META_MARKETING_ACCESS_TOKEN is not set");
  }

  const [accountSummary, campaigns] = await Promise.all([
    fetchAdAccountInsightsSummary(token),
    fetchAdAccountCampaigns(token),
  ]);

  const withInsights: MetaCampaignWithInsights[] = [];
  for (const campaign of campaigns) {
    try {
      const insights = await fetchCampaignInsights(campaign.id, token);
      withInsights.push({ ...campaign, insights });
    } catch {
      withInsights.push({ ...campaign, insights: parseMetaInsightRow({}) });
    }
  }

  return { accountSummary, campaigns: withInsights };
}
