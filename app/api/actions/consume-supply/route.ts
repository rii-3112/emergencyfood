import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing or malformed" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (_error) {
      return NextResponse.json(
        { error: "Invalid or expired ID token" },
        { status: 403 }
      );
    }

    const uid = decodedToken.uid;
    const { supplyId, quantity = 1 } = await req.json();

    if (!supplyId) {
      return NextResponse.json(
        { error: "Supply ID is required" },
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
    if (expiryDates.length === 0) {
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

    const sortedLots = [...expiryDates].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let remainingToConsume = quantity;
    const consumedFrom: Array<{ date: string; quantity: number }> = [];

    for (let i = 0; i < sortedLots.length && remainingToConsume > 0; i++) {
      const lot = sortedLots[i];
      const consumeFromThis = Math.min(lot.quantity, remainingToConsume);

      consumedFrom.push({
        date: lot.date,
        quantity: consumeFromThis,
      });

      lot.quantity -= consumeFromThis;
      remainingToConsume -= consumeFromThis;
    }

    const updatedExpiryDates = sortedLots.filter((lot) => lot.quantity > 0);

    const newTotalQuantity = updatedExpiryDates.reduce(
      (sum, lot) => sum + lot.quantity,
      0
    );

    const nearestDate =
      updatedExpiryDates.length > 0
        ? updatedExpiryDates.map((e) => e.date).sort()[0]
        : supply?.expiryDate;

    const updateData: Record<string, unknown> = {
      quantity: newTotalQuantity,
      expiryDates: updatedExpiryDates,
      expiryDate: nearestDate,
      lastConsumedDate: new Date().toISOString(),
      consumptionCount: (supply?.consumptionCount || 0) + quantity,
    };

    if (newTotalQuantity === 0 && !supply?.zeroStockSince) {
      updateData.zeroStockSince = new Date().toISOString();
    }
    if (newTotalQuantity > 0 && supply?.zeroStockSince) {
      updateData.zeroStockSince = null;
    }

    await supplyRef.update(updateData);

    return NextResponse.json({
      message: "Supply consumed successfully",
      consumed: {
        quantity,
        from: consumedFrom,
      },
      remaining: newTotalQuantity,
    });
  } catch (_error: unknown) {
    console.error("Consume supply error:", _error);
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
