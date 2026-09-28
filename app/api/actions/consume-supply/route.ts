import { NextResponse } from "next/server";

import { consumeSupply } from "@/lib/services/supply";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supplyId, quantity = 1 } = await req.json();
    const result = await consumeSupply({
      uid: user.uid,
      supplyId,
      quantity,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Consume supply error:", error);
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
