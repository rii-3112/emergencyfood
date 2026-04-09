import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
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
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User document not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userTeams = userData?.teams || [];

    if (!userTeams.includes(teamId)) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    await userDocRef.update({
      activeTeamId: teamId,
      teamId: teamId,
    });

    await adminAuth.setCustomUserClaims(uid, {
      teamId: teamId,
      email: decodedToken.email,
      displayName: decodedToken.name || null,
    });

    return NextResponse.json({
      message: "Team switched successfully",
      teamId: teamId,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
