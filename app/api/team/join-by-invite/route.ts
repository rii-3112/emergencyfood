import { NextResponse } from "next/server";

import { requireApiUser, syncUserTeamId } from "@/utils/auth/server";
import { adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.uid;
    const { inviteCode } = await req.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const inviteDoc = await adminDb.collection("invites").doc(inviteCode).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data();

    if (inviteData?.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { error: "Invite code has expired" },
        { status: 410 }
      );
    }

    const teamId = inviteData?.teamId;
    const teamName = inviteData?.teamName;

    if (!teamId) {
      return NextResponse.json(
        { error: "Invalid invite data" },
        { status: 400 }
      );
    }

    await adminDb.runTransaction(async (transaction) => {
      const userDocRef = adminDb.collection("users").doc(uid);
      const teamDocRef = adminDb.collection("teams").doc(teamId);

      const userDoc = await transaction.get(userDocRef);
      const teamDoc = await transaction.get(teamDocRef);

      if (!userDoc.exists) {
        throw new Error("User document not found.");
      }
      if (!teamDoc.exists) {
        throw new Error("Team document not found.");
      }

      const userData = userDoc.data();
      const teamData = teamDoc.data();

      const currentTeamMembers = teamData?.members || [];
      const currentUserTeams = userData?.teams || [];

      if (currentTeamMembers.includes(uid)) {
        transaction.update(userDocRef, {
          activeTeamId: teamId,
          teamId: teamId,
        });
        return;
      }

      transaction.update(userDocRef, {
        teams: [...currentUserTeams, teamId],
        activeTeamId: teamId,
        teamId: teamId,
      });
      transaction.update(teamDocRef, { members: [...currentTeamMembers, uid] });
    });

    await syncUserTeamId(uid, teamId);

    return NextResponse.json({
      message: `Successfully joined team "${teamName}"`,
      teamId: teamId,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
