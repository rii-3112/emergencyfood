import { NextResponse } from "next/server";

import { createTeam as createTeamService } from "@/lib/services/team";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamName, teamPassword } = await req.json();
    const result = await createTeamService({
      uid: user.uid,
      teamName,
      teamPassword,
    });

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
    if (errorMessage.includes("You are already a member of another team")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
