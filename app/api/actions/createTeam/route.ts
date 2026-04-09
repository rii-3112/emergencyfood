// app/api/actions/create-team/route.ts
import type { Transaction } from "firebase-admin/firestore";
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
    const { teamName, teamPassword } = await req.json();

    if (!teamName) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const teamsRef = adminDb.collection("teams");
    const existingTeamSnapshot = await teamsRef
      .where("name", "==", teamName)
      .get();
    if (!existingTeamSnapshot.empty) {
      return NextResponse.json(
        { error: "Team name already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = teamPassword || `auto-${uid}-${Date.now()}`;

    const newTeamId = await adminDb.runTransaction(
      async (transaction: Transaction) => {
        const userDocRef = adminDb.collection("users").doc(uid);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists) {
          throw new Error("User document not found.");
        }

        const userData = userDoc.data();
        const currentTeams = userData?.teams || [];

        const newTeamRef = teamsRef.doc();
        const generatedId = newTeamRef.id;

        transaction.set(newTeamRef, {
          name: teamName,
          password: hashedPassword,
          members: [uid],
          ownerId: uid,
          admins: [uid],
          createdAt: new Date(),
          createdBy: uid,
        });

        transaction.update(userDocRef, {
          teams: [...currentTeams, generatedId],
          activeTeamId: generatedId,
          teamId: generatedId,
        });

        return generatedId;
      }
    );

    await adminAuth.setCustomUserClaims(uid, {
      teamId: newTeamId,
      email: decodedToken.email,
      displayName: decodedToken.name || null,
    });

    return NextResponse.json({
      message: `Team "${teamName}" created and you joined.`,
      teamId: newTeamId,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    if (errorMessage.includes("You are already a member of another team")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    if (errorMessage.includes("Team name already exists")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
