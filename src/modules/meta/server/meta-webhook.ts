import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, receivedBuf);
}

export type MetaLeadgenChangeValue = {
  leadgen_id?: string;
  page_id?: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time?: number;
};

export type MetaLeadgenWebhookPayload = {
  object?: string;
  entry?: {
    id?: string;
    time?: number;
    changes?: { field?: string; value?: MetaLeadgenChangeValue }[];
  }[];
};

export function extractLeadgenIdsFromWebhook(payload: MetaLeadgenWebhookPayload): string[] {
  const ids = new Set<string>();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id?.trim();
      if (leadgenId) ids.add(leadgenId);
    }
  }

  return [...ids];
}
