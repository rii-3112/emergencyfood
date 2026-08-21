import { requireApiUser } from "@/utils/auth/server";
import { NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function GET(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const isArchived = searchParams.get("isArchived") === "true";

    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    const suppliesSnapshot = await adminDb
      .collection("supplies")
      .where("teamId", "==", teamId)
      .where("isArchived", "==", isArchived)
      .get();

    const supplies = suppliesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      supplies,
    });
  } catch (_error: unknown) {
    console.error("Supplies list fetch error:", _error);
    if (_error instanceof Error) {
      return NextResponse.json(
        { error: "備蓄品リストの取得に失敗しました" },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: "不明なエラーが発生しました" },
        { status: 500 }
      );
    }
  }
}
