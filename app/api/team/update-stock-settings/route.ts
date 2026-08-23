import { requireApiUser } from "@/utils/auth/server";
import { NextResponse } from "next/server";

import { updateStockSettingsForUser } from "@/lib/services/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import type { TeamStockSettings } from "@/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, stockSettings } = await req.json();

    if (!teamId || !stockSettings) {
      return NextResponse.json(
        { error: "Team ID and stock settings are required" },
        { status: 400 }
      );
    }

    const result = await updateStockSettingsForUser({
      uid: user.uid,
      teamId,
      stockSettings: stockSettings as Partial<TeamStockSettings>,
    });

    return NextResponse.json({
      message: "Stock settings updated successfully",
      stockSettings: result.stockSettings,
    });
  } catch (error: unknown) {
    if (error instanceof TeamServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Update stock settings error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
