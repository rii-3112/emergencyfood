import { NextResponse } from "next/server";

import { createSupply } from "@/lib/services/supply";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suppliesData = await req.json();
    const result = await createSupply({
      uid: user.uid,
      teamId: suppliesData.teamId,
      name: suppliesData.name,
      quantity: suppliesData.quantity,
      expiryDate: suppliesData.expiryDate,
      category: suppliesData.category,
      unit: suppliesData.unit,
      amount: suppliesData.amount,
      purchaseLocation: suppliesData.purchaseLocation,
      label: suppliesData.label,
      storageLocation: suppliesData.storageLocation,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Supply creation error:", error);
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "備蓄品の追加に失敗しました" },
      { status: 500 }
    );
  }
}
