import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { ensureFirestoreUser, requireApiUser } from "@/utils/auth/server";
import { adminDb } from "@/utils/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.uid;

    const ALLOWED_GENDERS = ["male", "female", "prefer_not_to_say"] as const;

    const body = await request.json();
    const { displayName, gender } = body as {
      displayName?: string;
      gender?: string;
    };

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: "表示名が必要です" }, { status: 400 });
    }

    const trimmedName = displayName.trim();

    const firestoreUpdates: Record<string, string> = {
      displayName: trimmedName,
    };

    if (gender !== undefined) {
      const isAllowed = ALLOWED_GENDERS.includes(
        gender as (typeof ALLOWED_GENDERS)[number]
      );
      if (!gender || typeof gender !== "string" || !isAllowed) {
        return NextResponse.json({ error: "性別が不正です" }, { status: 400 });
      }
      firestoreUpdates.gender = gender;
    }

    await ensureFirestoreUser({
      uid: userId,
      email: user.email,
      displayName: trimmedName,
      teamId: user.teamId ?? null,
    });

    await adminDb
      .collection("users")
      .doc(userId)
      .set(firestoreUpdates, { merge: true });

    await auth.api.updateUser({
      body: { name: trimmedName },
      headers: request.headers,
    });

    return NextResponse.json({
      success: true,
      message: "ユーザー名を更新しました",
    });
  } catch (_error) {
    console.error("update-user-name error:", _error);
    return NextResponse.json(
      { error: "ユーザー名の更新に失敗しました" },
      { status: 500 }
    );
  }
}
