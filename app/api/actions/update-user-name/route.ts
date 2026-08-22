import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { updateUserProfile } from "@/lib/services/user";
import { ensureFirestoreUser, requireApiUser } from "@/utils/auth/server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, gender } = body as {
      displayName?: string;
      gender?: string;
    };

    await ensureFirestoreUser({
      uid: user.uid,
      email: user.email,
      displayName: displayName?.trim() || user.displayName || user.email,
      teamId: user.teamId ?? null,
    });

    await updateUserProfile({
      uid: user.uid,
      displayName: displayName ?? "",
      gender,
    });

    await auth.api.updateUser({
      body: { name: (displayName ?? "").trim() },
      headers: request.headers,
    });

    return NextResponse.json({
      success: true,
      message: "ユーザー名を更新しました",
    });
  } catch (error: unknown) {
    console.error("update-user-name error:", error);
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "ユーザー名の更新に失敗しました" },
      { status: 500 }
    );
  }
}
