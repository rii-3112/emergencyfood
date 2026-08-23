// app/api/cron/check-expiry/route.ts
import { eq } from "drizzle-orm";
import { Client } from "@line/bot-sdk";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { user as userTable } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { listSuppliesByTeam } from "@/lib/repositories/supply";
import { toApiSupply } from "@/lib/services/supply";
import { adminDb } from "@/utils/firebase/admin";
import { calculateStockStatus } from "@/utils/stockCalculator";
import { getExpiryType } from "@/utils/stockRecommendations";

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};
const lineClient = new Client(lineConfig);

/** 同一チームへのLINE再送までの最短間隔（cronが1日複数回でも連投しにくくする） */
const LINE_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_JOB_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const teamsSnapshot = await adminDb.collection("teams").get();

    const teamNotifications: {
      [teamId: string]: {
        teamName: string;
        lineUserIds: string[];
        outOfStock: Array<{ name: string; id: string }>;
        expiryNear: Array<{
          name: string;
          expiryDate: string;
          remainingDays: number;
          id: string;
          expiryType: string;
        }>;
      };
    } = {};

    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const stockSettings = teamData.stockSettings;
      const notifications = stockSettings?.notifications;

      if (!notifications?.enabled) {
        continue;
      }

      const criticalOn = notifications.criticalStock !== false;
      const expiryOn = notifications.expiryNear !== false;
      if (!criticalOn && !expiryOn) {
        continue;
      }

      const lastNotifiedAt = teamData.lastWeeklyReportAt as
        | Timestamp
        | undefined;
      if (
        lastNotifiedAt &&
        now.getTime() - lastNotifiedAt.toDate().getTime() <
          LINE_ALERT_COOLDOWN_MS
      ) {
        continue;
      }

      const lineUserIds: string[] = [];
      for (const memberId of teamData.members || []) {
        try {
          const tursoUser = await db
            .select({ lineUserId: userTable.lineUserId })
            .from(userTable)
            .where(eq(userTable.id, memberId))
            .limit(1);
          let lineUserId = tursoUser[0]?.lineUserId ?? null;
          if (!lineUserId) {
            const userDoc = await adminDb
              .collection("users")
              .doc(memberId)
              .get();
            lineUserId =
              (userDoc.data()?.lineUserId as string | undefined) ?? null;
          }
          if (lineUserId) {
            lineUserIds.push(lineUserId);
          }
        } catch (error) {
          console.error(`Failed to get user ${memberId}:`, error);
        }
      }

      if (lineUserIds.length === 0) {
        continue;
      }

      const tursoSupplies = await listSuppliesByTeam(teamId, false);

      const outOfStock: Array<{ name: string; id: string }> = [];
      const expiryNear: Array<{
        name: string;
        expiryDate: string;
        remainingDays: number;
        id: string;
        expiryType: string;
      }> = [];

      for (const supply of tursoSupplies) {
        const supplyId = supply.id;

        if (criticalOn) {
          const stockStatus = calculateStockStatus(
            toApiSupply(supply) as any,
            stockSettings
          );

          if (stockStatus.status === "out") {
            outOfStock.push({ name: supply.name, id: supplyId });
          }
        }

        if (expiryOn && supply.quantity > 0 && supply.expiryDate) {
          const expiryType = getExpiryType(supply.category);

          if (expiryType.type === "noExpiry") {
            continue;
          }

          const expiryDate = new Date(supply.expiryDate);
          const remainingTime = expiryDate.getTime() - now.getTime();
          const remainingDays = Math.ceil(
            remainingTime / (1000 * 60 * 60 * 24)
          );

          const notificationDaysFromNow = new Date(
            now.getTime() + expiryType.notificationDays * 24 * 60 * 60 * 1000
          );

          if (expiryDate < notificationDaysFromNow && expiryDate > now) {
            expiryNear.push({
              name: supply.name,
              expiryDate: supply.expiryDate,
              remainingDays,
              id: supplyId,
              expiryType: expiryType.label,
            });
          }
        }
      }

      if (outOfStock.length > 0 || expiryNear.length > 0) {
        teamNotifications[teamId] = {
          teamName: teamData.name,
          lineUserIds,
          outOfStock,
          expiryNear: expiryNear.sort(
            (a, b) => a.remainingDays - b.remainingDays
          ),
        };
      }
    }

    const teamsToUpdateNotifiedAt: string[] = [];
    const MAX_ITEMS_TO_SHOW = 3;

    for (const teamId in teamNotifications) {
      const notification = teamNotifications[teamId];
      const { teamName, lineUserIds, outOfStock, expiryNear } = notification;

      let messageText = `【SonaBase 備蓄アラート】\nグループ: ${teamName}\n\n`;

      if (outOfStock.length > 0) {
        messageText += `━━━━━━━━━━━━━━━\n`;
        messageText += `⚠️ 在庫切れ (${outOfStock.length}件)\n`;
        messageText += `━━━━━━━━━━━━━━━\n`;
        outOfStock.forEach((item) => {
          messageText += `• ${item.name}\n`;
        });
        messageText += `\nすぐに買い足してください！\n\n`;
      }

      if (expiryNear.length > 0) {
        messageText += `━━━━━━━━━━━━━━━\n`;
        messageText += `📅 期限接近 (${expiryNear.length}件)\n`;
        messageText += `━━━━━━━━━━━━━━━\n`;
        expiryNear.slice(0, MAX_ITEMS_TO_SHOW).forEach((item) => {
          const urgency =
            item.remainingDays <= 3
              ? "🔴"
              : item.remainingDays <= 7
                ? "🟡"
                : "⚪";
          messageText += `${urgency} ${item.name} (${item.expiryType} 残り${item.remainingDays}日)\n`;
        });
        if (expiryNear.length > MAX_ITEMS_TO_SHOW) {
          messageText += `... 他${expiryNear.length - MAX_ITEMS_TO_SHOW}件\n`;
        }
        messageText += `\n`;
      }

      messageText += `━━━━━━━━━━━━━━━\n`;
      messageText += `詳細はSonaBaseで確認してください！\n`;
      messageText += `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.vercel.app"}/supplies/list`;

      for (const lineUserId of lineUserIds) {
        try {
          await lineClient.pushMessage(lineUserId, {
            type: "text",
            text: messageText,
          });
        } catch (lineError: unknown) {
          console.error(
            `Failed to send LINE notification to team ${teamId} (LINE ID: ${lineUserId}):`,
            lineError
          );
          if (
            lineError instanceof Error &&
            "originalError" in lineError &&
            lineError.originalError &&
            typeof lineError.originalError === "object" &&
            "response" in lineError.originalError &&
            lineError.originalError.response &&
            typeof lineError.originalError.response === "object" &&
            "data" in lineError.originalError.response &&
            lineError.originalError.response.data &&
            typeof lineError.originalError.response.data === "object" &&
            "message" in lineError.originalError.response.data &&
            lineError.originalError.response.data.message ===
              "User has not agreed to receive messages."
          ) {
            console.warn(
              `User has not agreed to receive messages from your LINE official account.`
            );
          }
        }
      }

      teamsToUpdateNotifiedAt.push(teamId);
    }

    if (teamsToUpdateNotifiedAt.length > 0) {
      const batch = adminDb.batch();
      teamsToUpdateNotifiedAt.forEach((teamId) => {
        const teamDocRef = adminDb.collection("teams").doc(teamId);
        batch.update(teamDocRef, {
          // フィールド名は後方互換のため維持（最終LINEアラート送信時刻）
          lastWeeklyReportAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return NextResponse.json(
      {
        message: "Stock/expiry alerts completed.",
        teamsSent: teamsToUpdateNotifiedAt.length,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
