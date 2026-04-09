import { NextResponse, type NextRequest } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { displayName } = await request.json();

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: "表示名が必要です" }, { status: 400 });
    }

    await adminDb.collection("users").doc(userId).update({
      displayName: displayName.trim(),
    });

    await adminAuth.updateUser(userId, {
      displayName: displayName.trim(),
    });

    const userRecord = await adminAuth.getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(userId, {
      ...currentClaims,
      displayName: displayName.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "ユーザー名を更新しました",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "ユーザー名の更新に失敗しました" },
      { status: 500 }
    );
  }
}
