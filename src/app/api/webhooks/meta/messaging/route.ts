import { NextResponse } from "next/server";

import { getMetaAppSecret, getMetaVerifyToken } from "@/modules/meta/server/meta-credentials";
import { processMetaMessagingWebhook } from "@/modules/meta/server/meta-messaging-webhook";
import { verifyMetaWebhookSignature } from "@/modules/meta/server/meta-webhook";

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

  let payload: Parameters<typeof processMetaMessagingWebhook>[0];
  try {
    payload = JSON.parse(rawBody) as Parameters<typeof processMetaMessagingWebhook>[0];
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  if (payload.object !== "page") {
    return NextResponse.json({ ok: true, processed: 0, skipped: "not a page event" });
  }

  const result = await processMetaMessagingWebhook(payload);
  return NextResponse.json({ ok: true, ...result });
}
