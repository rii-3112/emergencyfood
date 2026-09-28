import { NextResponse } from "next/server";

import { listSupplies } from "@/lib/services/supply";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function GET(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId") ?? "";
    const isArchived = searchParams.get("isArchived") === "true";

    const result = await listSupplies(user.uid, teamId, isArchived);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Supplies list fetch error:", error);
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "備蓄品リストの取得に失敗しました" },
      { status: 500 }
    );
  }
}
