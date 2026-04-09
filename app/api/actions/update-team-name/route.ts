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
    const { teamId, newTeamName } = await req.json();

    if (!teamId || !newTeamName) {
      return NextResponse.json(
        { error: "Team ID and new team name are required" },
        { status: 400 }
      );
    }

    const trimmedName = newTeamName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return NextResponse.json(
        { error: "Team name must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamData = teamDoc.data();

    const isOwner = teamData?.ownerId === uid;
    const isAdmin = teamData?.admins?.includes(uid);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Only team owners or admins can change the team name" },
        { status: 403 }
      );
    }

    await adminDb.collection("teams").doc(teamId).update({
      name: trimmedName,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: "Team name updated successfully",
      teamName: trimmedName,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
