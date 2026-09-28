import { NextResponse, type NextRequest } from "next/server";

import { removeSupply } from "@/lib/services/supply";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supplyId } = await request.json();
    const result = await removeSupply({
      uid: user.uid,
      supplyId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "備蓄品の削除に失敗しました" },
      { status: 500 }
    );
  }
}
