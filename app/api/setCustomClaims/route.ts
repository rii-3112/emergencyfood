import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  const body = await req.json();
  const { uid, teamId, email, displayName, lineUserId, idToken } = body;

  if (!idToken) {
    return NextResponse.json(
      { error: "ID token is required" },
      { status: 400 }
    );
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (uid && decodedToken.uid !== uid) {
      return NextResponse.json(
        { error: "Unauthorized: UID mismatch" },
        { status: 401 }
      );
    }

    if (uid) {
      const claims: Record<string, string | null> = {};
      if (teamId !== undefined) claims.teamId = teamId;
      if (email !== undefined) claims.email = email;
      if (displayName !== undefined) claims.displayName = displayName;
      if (lineUserId !== undefined) claims.lineUserId = lineUserId;

      await adminAuth.setCustomUserClaims(uid, claims);
      return NextResponse.json({ message: "カスタムクレームを設定しました" });
    }

    const userRecord = await adminAuth.getUser(decodedToken.uid);
    const isAdmin = userRecord.customClaims?.isAdmin === true;

    if (!isAdmin) {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    const usersSnapshot = await adminDb.collection("users").get();
    const results: Array<{ userId: string; success: boolean; error?: string }> =
      [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      try {
        const claims: Record<string, string | null> = {};
        if (userData.teamId !== undefined) claims.teamId = userData.teamId;
        if (userData.email !== undefined) claims.email = userData.email;
        if (userData.displayName !== undefined)
          claims.displayName = userData.displayName;
        if (userData.lineUserId !== undefined)
          claims.lineUserId = userData.lineUserId;

        await adminAuth.setCustomUserClaims(userId, claims);
        results.push({ userId, success: true });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: "一括カスタムクレーム設定を完了しました",
      results,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "カスタムクレームの設定に失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "This API only supports POST requests for setting custom claims.",
    },
    { status: 405 }
  );
}
