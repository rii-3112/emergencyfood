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
    const { supplyId, quantity, expiryDate, purchasePrice } = await req.json();

    if (!supplyId || !quantity || !expiryDate) {
      return NextResponse.json(
        { error: "Supply ID, quantity, and expiry date are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    const supplyRef = adminDb.collection("supplies").doc(supplyId);
    const supplyDoc = await supplyRef.get();

    if (!supplyDoc.exists) {
      return NextResponse.json({ error: "Supply not found" }, { status: 404 });
    }

    const supply = supplyDoc.data();

    const teamDoc = await adminDb.collection("teams").doc(supply?.teamId).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamData = teamDoc.data();
    if (!teamData?.members?.includes(uid)) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    let expiryDates = supply?.expiryDates || [];
    if (expiryDates.length === 0 && supply?.quantity > 0) {
      expiryDates = [
        {
          date: supply?.expiryDate || new Date().toISOString().split("T")[0],
          quantity: supply?.quantity || 0,
          addedAt:
            supply?.registeredAt?.toDate?.()?.toISOString?.() ||
            new Date().toISOString(),
        },
      ];
    }

    const existingIndex = expiryDates.findIndex(
      (e: { date: string }) => e.date === expiryDate
    );

    if (existingIndex >= 0) {
      expiryDates[existingIndex].quantity += quantity;
      if (purchasePrice !== undefined && purchasePrice !== null) {
        expiryDates[existingIndex].purchasePrice = purchasePrice;
      }
    } else {
      const newLot: Record<string, unknown> = {
        date: expiryDate,
        quantity,
        addedAt: new Date().toISOString(),
      };
      if (purchasePrice !== undefined && purchasePrice !== null) {
        newLot.purchasePrice = purchasePrice;
      }
      expiryDates.push(newLot);
    }

    const newTotalQuantity = expiryDates.reduce(
      (sum: number, lot: { quantity: number }) => sum + lot.quantity,
      0
    );

    const nearestDate = expiryDates
      .map((e: { date: string }) => e.date)
      .sort()[0];

    const updateData: Record<string, unknown> = {
      quantity: newTotalQuantity,
      expiryDates,
      expiryDate: nearestDate,
    };

    if (supply?.zeroStockSince) {
      updateData.zeroStockSince = null;
    }

    await supplyRef.update(updateData);

    return NextResponse.json({
      message: "Supply restocked successfully",
      added: {
        quantity,
        expiryDate,
      },
      totalQuantity: newTotalQuantity,
    });
  } catch (_error: unknown) {
    console.error("Restock supply error:", _error);
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
