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
    const { teamName, teamPassword } = await req.json();

    if (!teamName || !teamPassword) {
      return NextResponse.json(
        { error: "Team name and password are required" },
        { status: 400 }
      );
    }

    const teamsRef = adminDb.collection("teams");
    const q = teamsRef.where("name", "==", teamName);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamDoc = querySnapshot.docs[0];
    const teamData = teamDoc.data();
    const foundTeamId = teamDoc.id;
    if (teamData?.password !== teamPassword) {
      return NextResponse.json(
        { error: "Incorrect team name or password" },
        { status: 401 }
      );
    }

    await adminDb.runTransaction(async (transaction) => {
      const userDocRef = adminDb.collection("users").doc(uid);
      const teamDocRef = adminDb.collection("teams").doc(foundTeamId);

      const userDoc = await transaction.get(userDocRef);
      const teamDocFromTransaction = await transaction.get(teamDocRef);

      if (!userDoc.exists) {
        throw new Error("User document not found.");
      }
      if (!teamDocFromTransaction.exists) {
        throw new Error("Team document not found.");
      }

      const userData = userDoc.data();
      const teamDataAfterTransaction = teamDocFromTransaction.data();

      const currentTeamMembers = teamDataAfterTransaction?.members || [];
      const currentUserTeams = userData?.teams || [];

      if (currentTeamMembers.includes(uid)) {
        transaction.update(userDocRef, {
          activeTeamId: foundTeamId,
          teamId: foundTeamId,
        });
        return;
      }

      transaction.update(userDocRef, {
        teams: [...currentUserTeams, foundTeamId],
        activeTeamId: foundTeamId,
        teamId: foundTeamId,
      });
      transaction.update(teamDocRef, { members: [...currentTeamMembers, uid] });
    });

    await syncUserTeamId(uid, foundTeamId);

    return NextResponse.json({
      message: `Successfully joined team "${teamName}" and updated claims.`,
      teamId: foundTeamId,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    if (errorMessage.includes("You are already a member of another team")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
