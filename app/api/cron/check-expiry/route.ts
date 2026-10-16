// app/api/cron/check-expiry/route.ts
import { eq } from "drizzle-orm";
import { Client } from "@line/bot-sdk";
import { NextResponse } from "next/server";

import { user as userTable } from "@/lib/auth-schema";
import { db } from "@/lib/db";
import { listSuppliesByTeam } from "@/lib/repositories/supply";
import { listAllTeams, listTeamMemberIds } from "@/lib/repositories/team";
import { markTeamNotified } from "@/lib/services/team";
import { toApiSupply } from "@/lib/services/supply";
import {
  buildWeeklyDigestMessage,
  collectWeeklyDigestIssues,
  hasWeeklyDigestIssues,
  LINE_WEEKLY_DIGEST_COOLDOWN_MS,
} from "@/utils/lineWeeklyDigest";

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
    const allTeams = await listAllTeams();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.vercel.app";

    const teamNotifications: {
      [teamId: string]: {
        teamName: string;
        lineUserIds: string[];
        messageText: string;
      };
    } = {};

    for (const teamRecord of allTeams) {
      const teamId = teamRecord.id;
      const stockSettings = teamRecord.stockSettings;
      const notifications = stockSettings?.notifications;

      if (!notifications?.enabled) continue;

      const criticalOn = notifications.criticalStock !== false;
      const expiryOn = notifications.expiryNear !== false;
      if (!criticalOn && !expiryOn) continue;

      const lastNotifiedAt = teamRecord.lastWeeklyReportAt;
      if (
        lastNotifiedAt &&
        now.getTime() - lastNotifiedAt.getTime() <
          LINE_WEEKLY_DIGEST_COOLDOWN_MS
      ) {
        continue;
      }

      const memberIds = await listTeamMemberIds(teamId);
      const lineUserIds: string[] = [];

      for (const memberId of memberIds) {
        try {
          const tursoUser = await db
            .select({ lineUserId: userTable.lineUserId })
            .from(userTable)
            .where(eq(userTable.id, memberId))
            .limit(1);
          const lineUserId = tursoUser[0]?.lineUserId ?? null;
          if (lineUserId) {
            lineUserIds.push(lineUserId);
          }
        } catch (error) {
          console.error(`Failed to get user ${memberId}:`, error);
        }
      }

      if (lineUserIds.length === 0) continue;

      const tursoSupplies = await listSuppliesByTeam(teamId, false);
      const supplies = tursoSupplies.map(toApiSupply);
      const issues = collectWeeklyDigestIssues(
        supplies,
        stockSettings,
        {
          criticalStock: criticalOn,
          expiryNear: expiryOn,
        },
        now
      );

      if (!hasWeeklyDigestIssues(issues)) continue;

      teamNotifications[teamId] = {
        teamName: teamRecord.name,
        lineUserIds,
        messageText: buildWeeklyDigestMessage({
          teamName: teamRecord.name,
          issues,
          appUrl,
        }),
      };
    }

    const teamsToUpdateNotifiedAt: string[] = [];

    for (const teamId in teamNotifications) {
      const notification = teamNotifications[teamId];
      const { lineUserIds, messageText } = notification;

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
        }
      }

      teamsToUpdateNotifiedAt.push(teamId);
    }

    for (const teamId of teamsToUpdateNotifiedAt) {
      await markTeamNotified(teamId, now);
    }

    return NextResponse.json(
      {
        message: "Weekly supply digest completed.",
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
