import { requireApiUser } from "@/utils/auth/server";
import { NextResponse, type NextRequest } from "next/server";

import { addTeamAdmin } from "@/lib/services/team";
import { TeamServiceError } from "@/lib/services/team-errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, userId: targetUserId } = await request.json();

    if (!teamId || !targetUserId) {
      return NextResponse.json(
        { error: "チームIDとユーザーIDが必要です" },
        { status: 400 }
      );
    }

    await addTeamAdmin({
      uid: user.uid,
      teamId,
      targetUserId,
    });

    return NextResponse.json({
      success: true,
      message: "管理者を追加しました",
    });
  } catch (error) {
    if (error instanceof TeamServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "管理者の追加に失敗しました" },
      { status: 500 }
    );
  }
}
