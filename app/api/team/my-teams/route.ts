import { NextRequest, NextResponse } from "next/server";

import { isTeamServiceError } from "@/lib/services/team-errors";
import { listMyTeams } from "@/lib/services/user";
import { requireApiUser } from "@/utils/auth/server";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listMyTeams(user.uid, user.teamId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
