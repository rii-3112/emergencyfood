import { requireApiUser } from "@/utils/auth/server";
import { NextResponse } from "next/server";

import { updateTeamNameForUser } from "@/lib/services/team";
import { TeamServiceError } from "@/lib/services/team-errors";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, newTeamName } = await req.json();

    if (!teamId || !newTeamName) {
      return NextResponse.json(
        { error: "Team ID and new team name are required" },
        { status: 400 }
      );
    }

    const result = await updateTeamNameForUser({
      uid: user.uid,
      teamId,
      newTeamName,
    });

    return NextResponse.json({
      message: "Team name updated successfully",
      teamName: result.teamName,
    });
  } catch (error: unknown) {
    if (error instanceof TeamServiceError) {
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
