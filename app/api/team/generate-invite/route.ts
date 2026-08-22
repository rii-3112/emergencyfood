import { requireApiUser } from "@/utils/auth/server";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.uid;
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

    const inviteCode = randomUUID().split("-")[0].toUpperCase();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await adminDb
      .collection("invites")
      .doc(inviteCode)
      .set({
        teamId: teamId,
        teamName: teamName || teamData?.name || "",
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
