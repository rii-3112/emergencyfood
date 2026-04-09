import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing or malformed" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (_error) {
      return NextResponse.json(
        { error: "Invalid or expired ID token" },
        { status: 403 }
      );
    }

    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User document not found" },
        { status: 404 }
      );
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
