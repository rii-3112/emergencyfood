import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  const { idToken } = await req.json();
  if (!idToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const teamId = userDoc.data()?.teamId;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId が存在しません" },
        { status: 400 }
      );
    }

    await adminAuth.setCustomUserClaims(uid, { teamId });

    return NextResponse.json({ message: "カスタムクレームが設定されました" });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "カスタムクレームの設定に失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
