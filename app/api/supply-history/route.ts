// app/api/supply-history/route.ts

import { requireApiUser } from "@/utils/auth/server";
import { NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function GET(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = user.teamId;
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
