import { requireApiUser } from "@/utils/auth/server";
import { NextResponse, type NextRequest } from "next/server";

import {
  findDisasterBoardByTeamId,
  upsertDisasterBoard,
} from "@/lib/repositories/handbook";
import { isTeamMember } from "@/lib/repositories/team";
import type { DisasterBoardData } from "@/types/forms";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = user.teamId as string;
    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    const data = await findDisasterBoardByTeamId(teamId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Disaster board fetch error:", error);
    return NextResponse.json(
      { error: "災害用伝言板の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = user.teamId as string;
    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    if (!(await isTeamMember(teamId, user.uid))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const disasterBoardData: DisasterBoardData = {
      evacuationSites: body.evacuationSites || [],
      evacuationRoutes: body.evacuationRoutes || [],
      safetyMethods: body.safetyMethods || [],
      familyAgreements: body.familyAgreements || [],
      useDisasterDial: body.useDisasterDial ?? true,
      lastUpdated: new Date(),
      lastUpdatedBy: user.displayName || user.email || "ユーザー",
    };

    await upsertDisasterBoard(teamId, disasterBoardData);

    return NextResponse.json({
      success: true,
      message: "災害用伝言板の情報を保存しました",
    });
  } catch (error) {
    console.error("Disaster board save error:", error);
    return NextResponse.json(
      { error: "災害用伝言板の保存に失敗しました" },
      { status: 500 }
    );
  }
}
