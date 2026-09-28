// app/api/line/webhook/route.ts
import * as crypto from "crypto";

import {
  messagingApi,
  type TextMessage,
  type WebhookEvent,
} from "@line/bot-sdk";
import { NextResponse } from "next/server";

import {
  findLineAuthCodeByLineUserId,
  upsertLineAuthCode,
} from "@/lib/repositories/line-auth";

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!lineConfig.channelSecret) {
    return NextResponse.json(
      { message: "Server configuration error" },
      { status: 500 }
    );
  }
  if (!signature) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", lineConfig.channelSecret)
    .update(rawBody)
    .digest("base64");

  if (signature !== expectedSignature) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid signature" },
      { status: 401 }
    );
  }

  let body: { events: WebhookEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const events: WebhookEvent[] = body.events;

  try {
    await Promise.all(
      events.map(async (event: WebhookEvent) => {
        const lineUserId = event.source.userId;
        if (!lineUserId) return;

        if (event.type === "follow") {
          const authCode = Math.floor(
            100000 + Math.random() * 900000
          ).toString();
          const expireAt = new Date(Date.now() + 5 * 60 * 1000);

          await upsertLineAuthCode({ lineUserId, code: authCode, expireAt });

          const lineClient = new messagingApi.MessagingApiClient(lineConfig);
          const message: TextMessage = {
            type: "text",
            text: `SonaBase LINE連携のご登録ありがとうございます！\n\nアプリと連携するための認証コードは【${authCode}】です。\n\nこのコードは5分間有効です。\n\nSonaBaseアプリの「設定」画面で、このコードを入力してください。`,
          };

          try {
            await lineClient.pushMessage({
              to: lineUserId,
              messages: [message],
            });
          } catch {
            /* LINE push failure is non-fatal for webhook */
          }
        } else if (event.type === "message" && event.message.type === "text") {
          const userMessage = event.message.text;
          if (userMessage === "コード再送") {
            const existing = await findLineAuthCodeByLineUserId(lineUserId);
            const lineClient = new messagingApi.MessagingApiClient(lineConfig);

            if (existing && existing.expireAt.getTime() > Date.now()) {
              const message: TextMessage = {
                type: "text",
                text: `認証コードを再送します：【${existing.code}】\n\nこのコードはまだ有効です。\n\nアプリの「設定」画面で入力してください。`,
              };
              await lineClient.pushMessage({
                to: lineUserId,
                messages: [message],
              });
            } else {
              const message: TextMessage = {
                type: "text",
                text: "現在有効な認証コードが見つからないか、期限切れです。\n恐れ入りますが、もう一度友だち追加をやり直してください。\n（または、アプリで「LINE連携」ボタンを押してください）",
              };
              await lineClient.pushMessage({
                to: lineUserId,
                messages: [message],
              });
            }
          }
        }
      })
    );

    return NextResponse.json(
      { message: "Webhook events processed." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
