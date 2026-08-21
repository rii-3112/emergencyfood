import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { requireApiUser } from "@/utils/auth/server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPassword, currentPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上である必要があります" },
        { status: 400 }
      );
    }

    // Prefer changePassword when currentPassword is provided; otherwise
    // use server-only setPassword for backward-compatible clients.
    if (currentPassword) {
      await auth.api.changePassword({
        body: {
          newPassword,
          currentPassword,
          revokeOtherSessions: true,
        },
        headers: request.headers,
      });
    } else {
      await auth.api.setPassword({
        body: { newPassword },
        headers: request.headers,
      });
    }

    return NextResponse.json({
      success: true,
      message: "パスワードを変更しました",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "パスワードの変更に失敗しました" },
      { status: 500 }
    );
  }
}
