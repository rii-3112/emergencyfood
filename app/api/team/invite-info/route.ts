import { NextRequest, NextResponse } from "next/server";

import { getInviteInfo } from "@/lib/services/invite";
import { isTeamServiceError } from "@/lib/services/team-errors";

export async function GET(request: NextRequest) {
  try {
    const inviteCode = request.nextUrl.searchParams.get("code") ?? "";
    const result = await getInviteInfo(inviteCode);
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
