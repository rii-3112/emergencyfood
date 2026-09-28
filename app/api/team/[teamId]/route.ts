import { NextResponse, type NextRequest } from "next/server";

import { getTeamDetail } from "@/lib/services/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    const result = await getTeamDetail(teamId, user.uid);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TeamServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "チーム情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
