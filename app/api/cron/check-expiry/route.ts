// app/api/cron/check-expiry/route.ts
import { adminAuth, adminDb } from "@/utils/firebase/admin";
import { calculateStockStatus } from "@/utils/stockCalculator";
import { getExpiryType } from "@/utils/stockRecommendations";
import { Client } from "@line/bot-sdk";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};
const lineClient = new Client(lineConfig);

export async function POST(req: Request) {
  try {
    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_JOB_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const teamsSnapshot = await adminDb.collection("teams").get();

    const teamNotifications: {
      [teamId: string]: {
        teamName: string;
        lineUserIds: string[];
        outOfStock: Array<{ name: string; id: string }>;
        lowStock: Array<{
          name: string;
          quantity: number;
          unit: string;
          id: string;
        }>;
        expiryNear: Array<{
          name: string;
          expiryDate: string;
          remainingDays: number;
          id: string;
          expiryType: string;
        }>;
        autoArchivedCount: number;
        lastNotifiedAt?: Timestamp;
      };
    } = {};

    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const stockSettings = teamData.stockSettings;

      if (!stockSettings?.notifications?.enabled) {
        continue;
      }

      if (!stockSettings?.notifications?.weeklyReport) {
        continue;
      }

      const lastNotifiedAt = teamData.lastWeeklyReportAt;
      if (
        lastNotifiedAt &&
        now.getTime() - lastNotifiedAt.toDate().getTime() <
          7 * 24 * 60 * 60 * 1000
      ) {
        continue;
      }

      const lineUserIds: string[] = [];
      for (const memberId of teamData.members || []) {
        try {
          const userRecord = await adminAuth.getUser(memberId);
          const lineUserId = userRecord.customClaims?.lineUserId as
            | string
            | undefined;
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

      const suppliesSnapshot = await adminDb
        .collection("supplies")
        .where("teamId", "==", teamId)
        .where("isArchived", "==", false)
        .get();

      const outOfStock: Array<{ name: string; id: string }> = [];
      const lowStock: Array<{
        name: string;
        quantity: number;
        unit: string;
        id: string;
      }> = [];
      const expiryNear: Array<{
        name: string;
        expiryDate: string;
        remainingDays: number;
        id: string;
        expiryType: string;
      }> = [];

      suppliesSnapshot.docs.forEach((doc) => {
        const supply = doc.data();
        const supplyId = doc.id;

        if (
          stockSettings.notifications.criticalStock ||
          stockSettings.notifications.lowStock
        ) {
          const stockStatus = calculateStockStatus(
            { ...supply, id: supplyId } as any,
            stockSettings
          );

          if (
            stockStatus.status === "out" &&
            stockSettings.notifications.criticalStock
          ) {
            outOfStock.push({ name: supply.name, id: supplyId });
          } else if (
            (stockStatus.status === "critical" ||
              stockStatus.status === "low") &&
            stockSettings.notifications.lowStock
          ) {
            lowStock.push({
              name: supply.name,
              quantity: supply.quantity,
              unit: supply.unit,
              id: supplyId,
            });
          }
        }

        if (
          stockSettings.notifications.expiryNear &&
          supply.quantity > 0 &&
          supply.expiryDate
        ) {
          const expiryType = getExpiryType(supply.category);

          if (expiryType.type === "noExpiry") {
            return;
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
      });

      const historySnapshot = await adminDb
        .collection("supply_history")
        .where("teamId", "==", teamId)
        .where("archivedBy", "==", "system")
        .where("archivedAt", ">=", sevenDaysAgo.toISOString())
        .get();

      const autoArchivedCount = historySnapshot.size;

      if (
        outOfStock.length > 0 ||
        lowStock.length > 0 ||
        expiryNear.length > 0 ||
        autoArchivedCount > 0
      ) {
        teamNotifications[teamId] = {
          teamName: teamData.name,
          lineUserIds,
          outOfStock,
          lowStock,
          expiryNear: expiryNear.sort(
            (a, b) => a.remainingDays - b.remainingDays
          ),
          autoArchivedCount,
          lastNotifiedAt: teamData.lastWeeklyReportAt,
        };
      }
    }

    const teamsToUpdateNotifiedAt: string[] = [];
    const MAX_ITEMS_TO_SHOW = 3;

    for (const teamId in teamNotifications) {
      const notification = teamNotifications[teamId];
      const {
        teamName,
        lineUserIds,
        outOfStock,
        lowStock,
        expiryNear,
        autoArchivedCount,
      } = notification;

      let messageText = `【SonaBase 週次レポート】\nグループ: ${teamName}\n\n`;

      if (outOfStock.length > 0) {
        messageText += `━━━━━━━━━━━━━━━\n`;
        messageText += `⚠️ 在庫切れ (${outOfStock.length}件)\n`;
        messageText += `━━━━━━━━━━━━━━━\n`;
        outOfStock.forEach((item) => {
          messageText += `• ${item.name}\n`;
        });
        messageText += `\nすぐに買い足してください！\n\n`;
      }

      if (lowStock.length > 0) {
        messageText += `━━━━━━━━━━━━━━━\n`;
        messageText += `⚡ 在庫少ない (${lowStock.length}件)\n`;
        messageText += `━━━━━━━━━━━━━━━\n`;
        lowStock.slice(0, MAX_ITEMS_TO_SHOW).forEach((item) => {
          messageText += `• ${item.name} (残り${item.quantity}${item.unit})\n`;
        });
        if (lowStock.length > MAX_ITEMS_TO_SHOW) {
          messageText += `... 他${lowStock.length - MAX_ITEMS_TO_SHOW}件\n`;
        }
        messageText += `\n早めの買い足しをおすすめします\n\n`;
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

      if (autoArchivedCount > 0) {
        messageText += `━━━━━━━━━━━━━━━\n`;
        messageText += `📚 自動履歴化\n`;
        messageText += `━━━━━━━━━━━━━━━\n`;
        messageText += `在庫0個が30日続いた${autoArchivedCount}件を履歴に移動しました\n\n`;
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
          lastWeeklyReportAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return NextResponse.json(
      {
        message: "Weekly report completed and notifications sent.",
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
