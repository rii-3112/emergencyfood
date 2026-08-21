import { requireApiUser } from "@/utils/auth/server";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Google 登録直後など、Firestore 未作成でもヘッダーが壊れないようにする
      return NextResponse.json({
        teams: [],
        activeTeamId: null,
      });
    }

    const userData = userDoc.data();
    const userTeams = userData?.teams || [];
    const activeTeamId = userData?.activeTeamId || userData?.teamId || null;

    const teams = await Promise.all(
      userTeams.map(async (teamId: string) => {
        const teamDoc = await adminDb.collection("teams").doc(teamId).get();
        if (teamDoc.exists) {
          const teamData = teamDoc.data();
          return {
            id: teamDoc.id,
            name: teamData?.name || "不明なチーム",
            isActive: teamId === activeTeamId,
          };
        }
        return null;
      })
    );

    const validTeams = teams.filter((team) => team !== null);

    return NextResponse.json({
      teams: validTeams,
      activeTeamId: activeTeamId,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
