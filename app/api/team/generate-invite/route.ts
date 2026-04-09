import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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
    const { teamId, teamName } = await req.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const teamDoc = await adminDb.collection("teams").doc(teamId).get();

    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamData = teamDoc.data();
    const members = teamData?.members || [];

    if (!members.includes(uid)) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    const inviteCode = uuidv4().split("-")[0].toUpperCase();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await adminDb
      .collection("invites")
      .doc(inviteCode)
      .set({
        teamId: teamId,
        teamName: teamName || teamData?.name || "",
        teamPassword: teamData?.password || "",
        createdBy: uid,
        createdAt: new Date(),
        expiresAt: expiresAt,
        used: false,
      });

    return NextResponse.json({
      inviteCode: inviteCode,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
