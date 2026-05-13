import { parseMetaLeadFieldData } from "@/modules/meta/lib/meta-lead-fields";
import { metaGraphUrl } from "@/modules/meta/lib/meta-graph-version";
import { getMetaPageAccessToken } from "@/modules/meta/server/meta-credentials";
import { getResolvedMetaAdAccountAct, getResolvedMetaPageId } from "@/modules/meta/server/meta-sync-env";

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
};

export type MetaGraphLead = {
  id: string;
  created_time?: string;
  field_data?: { name?: string; values?: string[] }[];
};

export type MetaSyncHealth = {
  ok: boolean;
  page?: { id: string; name: string };
  adAccount?: { id: string; name: string; accountStatus?: number };
  error?: string;
};

export async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = new URL(metaGraphUrl(path));
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const body = (await res.json()) as T & GraphErrorBody;
  if (!res.ok) {
    const message = body.error?.message ?? `Graph API ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export async function fetchMetaLead(leadgenId: string, accessToken?: string): Promise<MetaGraphLead> {
  const token = accessToken ?? getMetaPageAccessToken();
  if (!token) {
    throw new Error("META_PAGE_ACCESS_TOKEN is not set");
  }
  return graphGet<MetaGraphLead>(`${leadgenId}?fields=id,created_time,field_data`, token);
}

export async function getMetaSyncHealth(): Promise<MetaSyncHealth> {
  const accessToken = getMetaPageAccessToken();
  if (!accessToken) {
    return { ok: false, error: "META_PAGE_ACCESS_TOKEN is not set" };
  }

  const pageId = getResolvedMetaPageId();
  const adAccountAct = getResolvedMetaAdAccountAct();

  try {
    const [page, adAccount] = await Promise.all([
      graphGet<{ id: string; name: string }>(`${pageId}?fields=id,name`, accessToken),
      graphGet<{ id: string; name: string; account_status?: number }>(
        `${adAccountAct}?fields=id,name,account_status`,
        accessToken,
      ),
    ]);

    return {
      ok: true,
      page: { id: page.id, name: page.name },
      adAccount: {
        id: adAccount.id,
        name: adAccount.name,
        accountStatus: adAccount.account_status,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Meta connection check failed" };
  }
}

export function mapMetaLeadToLeadFields(lead: MetaGraphLead) {
  const parsed = parseMetaLeadFieldData(lead.field_data);
  return {
    metaLeadId: lead.id,
    fullName: parsed.fullName,
    email: parsed.email,
    phone: parsed.phone,
    source: "meta" as const,
    fieldSnapshot: parsed.raw,
    createdTime: lead.created_time ?? null,
  };
}
