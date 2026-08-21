// app/api/actions/restore-from-history/route.ts

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
    const teamId = user.teamId;
    const {
      historyId,
      quantity,
      unit,
      expiryDate,
      purchaseLocation,
      amount,
      label,
      storageLocation,
    } = await req.json();

    if (!historyId || !quantity || !expiryDate) {
      return NextResponse.json(
        { error: "History ID, quantity, and expiry date are required" },
        { status: 400 }
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID not found in token" },
        { status: 400 }
      );
    }

    const historyRef = adminDb.collection("supply_history").doc(historyId);
    const historyDoc = await historyRef.get();

    if (!historyDoc.exists) {
      const historySnapshot = await adminDb
        .collection("supply_history")
        .where("id", "==", historyId)
        .where("teamId", "==", teamId)
        .limit(1)
        .get();

      if (historySnapshot.empty) {
        console.error("History not found:", historyId, "Team:", teamId);
        return NextResponse.json(
          { error: "History not found" },
          { status: 404 }
        );
      }

      const history = historySnapshot.docs[0].data();

      const newSupply = {
        name: history?.name,
        category: history?.category,
        unit: unit || history?.unit,
        quantity,
        expiryDate,
        expiryDates: [
          {
            date: expiryDate,
            quantity,
            addedAt: new Date().toISOString(),
          },
        ],
        purchaseLocation: purchaseLocation || null,
        isArchived: false,
        teamId,
        uid,
        registeredAt: new Date(),
        amount: amount || null,
        label: label || null,
        storageLocation: storageLocation || null,
        lastConsumedDate: null,
        consumptionCount: 0,
      };

      const supplyRef = await adminDb.collection("supplies").add(newSupply);
      const newSupplyId = supplyRef.id;

      if (history?.hasReviews) {
        const oldReviewsSnapshot = await adminDb
          .collection("supplyReviews")
          .where("supplyId", "==", historyId)
          .where("teamId", "==", teamId)
          .get();

        const batch = adminDb.batch();

        for (const reviewDoc of oldReviewsSnapshot.docs) {
          const reviewData = reviewDoc.data();
          batch.set(adminDb.collection("supplyReviews").doc(), {
            ...reviewData,
            supplyId: newSupplyId,
            updatedAt: new Date(),
          });
        }

        await batch.commit();
      }

      return NextResponse.json({
        message: "Supply restored from history successfully",
        supplyId: newSupplyId,
        supply: { ...newSupply, id: newSupplyId },
      });
    }

    const history = historyDoc.data();

    if (history?.teamId !== teamId) {
      return NextResponse.json(
        { error: "History does not belong to your team" },
        { status: 403 }
      );
    }

    const newSupply = {
      name: history?.name,
      category: history?.category,
      unit: unit || history?.unit,
      quantity,
      expiryDate,
      expiryDates: [
        {
          date: expiryDate,
          quantity,
          addedAt: new Date().toISOString(),
        },
      ],
      purchaseLocation: purchaseLocation || null,
      isArchived: false,
      teamId,
      uid,
      registeredAt: new Date(),
      amount: amount || null,
      label: label || null,
      storageLocation: storageLocation || null,
      lastConsumedDate: null,
      consumptionCount: 0,
    };

    const supplyRef = await adminDb.collection("supplies").add(newSupply);
    const newSupplyId = supplyRef.id;

    if (history?.hasReviews) {
      const oldReviewsSnapshot = await adminDb
        .collection("supplyReviews")
        .where("supplyId", "==", historyId)
        .where("teamId", "==", teamId)
        .get();

      const batch = adminDb.batch();

      for (const reviewDoc of oldReviewsSnapshot.docs) {
        const reviewData = reviewDoc.data();
        batch.set(adminDb.collection("supplyReviews").doc(), {
          ...reviewData,
          supplyId: newSupplyId,
          updatedAt: new Date(),
        });
      }

      await batch.commit();
    }

    return NextResponse.json({
      message: "Supply restored from history successfully",
      supplyId: newSupplyId,
      supply: { ...newSupply, id: newSupplyId },
    });
  } catch (_error: unknown) {
    console.error("Restore from history error:", _error);
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
