// app/api/supply-history/route.ts

import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function GET(req: Request) {
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

    const teamId = decodedToken.teamId;
    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID not found in token" },
        { status: 400 }
      );
    }

    const historySnapshot = await adminDb
      .collection("supply_history")
      .where("teamId", "==", teamId)
      .get();

    const histories = historySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.archivedAt || 0).getTime();
        const dateB = new Date(b.archivedAt || 0).getTime();
        return dateB - dateA;
      });

    return NextResponse.json({ histories });
  } catch (_error: unknown) {
    console.error("Get supply history error:", _error);
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
