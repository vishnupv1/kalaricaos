import { NextResponse } from "next/server";

import { getMetaAppSecret, getMetaVerifyToken } from "@/modules/meta/server/meta-credentials";
import { processMetaLeadgenWebhookLeadIds } from "@/modules/meta/server/meta-lead-sync";
import {
  extractLeadgenIdsFromWebhook,
  verifyMetaWebhookSignature,
  type MetaLeadgenWebhookPayload,
} from "@/modules/meta/server/meta-webhook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = getMetaVerifyToken();

  if (mode === "subscribe" && challenge && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = getMetaAppSecret();
  if (!appSecret) {
    return new NextResponse("Meta app secret not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: MetaLeadgenWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaLeadgenWebhookPayload;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const leadgenIds = extractLeadgenIdsFromWebhook(payload);
  if (leadgenIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results = await processMetaLeadgenWebhookLeadIds(leadgenIds);
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    console.error("[meta/webhook] lead sync failures", failed);
  }

  return NextResponse.json({
    ok: failed.length === 0,
    processed: results.length,
    created: results.filter((r) => r.ok && r.created).length,
    updated: results.filter((r) => r.ok && !r.created).length,
    errors: failed.map((r) => ({ metaLeadId: r.metaLeadId, error: r.error })),
  });
}
