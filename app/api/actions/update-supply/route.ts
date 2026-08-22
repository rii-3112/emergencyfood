import { NextResponse } from "next/server";

import { updateSupplyFields } from "@/lib/services/supply";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supplyId, updates } = await req.json();
    const result = await updateSupplyFields({
      uid: user.uid,
      supplyId,
      updates,
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
      error instanceof Error
        ? error.message
        : "Failed to update supply item.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
