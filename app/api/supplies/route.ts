import { requireApiUser } from "@/utils/auth/server";
import { NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.uid;
    const suppliesData = await req.json();

    const { name, quantity, expiryDate, category, unit, teamId } = suppliesData;

    if (!name || !quantity || !expiryDate || !category || !unit || !teamId) {
      return NextResponse.json(
        { error: "必須フィールドが不足しています" },
        { status: 400 }
      );
    }

    const supplyRef = await adminDb.collection("supplies").add({
      name,
      quantity: Number(quantity) || 1,
      expiryDate,
      isArchived: false,
      category,
      unit,
      amount:
        suppliesData.amount !== undefined ? Number(suppliesData.amount) : null,
      purchaseLocation: suppliesData.purchaseLocation || null,
      label: suppliesData.label || null,
      storageLocation: suppliesData.storageLocation || "未設定",
      registeredAt: new Date(),
      teamId,
      uid,
    });

    return NextResponse.json({
      success: true,
      supplyId: supplyRef.id,
      message: "備蓄品を追加しました",
    });
  } catch (_error: unknown) {
    console.error("Supply creation error:", _error);
    if (_error instanceof Error) {
      return NextResponse.json(
        { error: "備蓄品の追加に失敗しました" },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: "不明なエラーが発生しました" },
        { status: 500 }
      );
    }
  }
}
