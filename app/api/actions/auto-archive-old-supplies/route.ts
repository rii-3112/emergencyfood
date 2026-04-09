// app/api/actions/auto-archive-old-supplies/route.ts

import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";
import { convertSupplyToHistory } from "@/utils/supplyHistoryHelpers";

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

    const _uid = decodedToken.uid;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldSuppliesSnapshot = await adminDb
      .collection("supplies")
      .where("quantity", "==", 0)
      .where("isArchived", "==", false)
      .get();

    const suppliesToArchive = oldSuppliesSnapshot.docs.filter((doc) => {
      const data = doc.data();
      const zeroStockSince = data.zeroStockSince;

      if (zeroStockSince && new Date(zeroStockSince) < thirtyDaysAgo) {
        return true;
      }
      return false;
    });

    const archivedSupplies: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const supplyDoc of suppliesToArchive) {
      try {
        const supplyData = supplyDoc.data();
        const supplyId = supplyDoc.id;

        const reviewsSnapshot = await adminDb
          .collection("reviews")
          .where("supplyId", "==", supplyId)
          .get();

        const reviews = reviewsSnapshot.docs.map((doc) => doc.data());

        const history = await convertSupplyToHistory(
          { ...supplyData, id: supplyId } as any,
          "system",
          reviews as any
        );

        const existingHistorySnapshot = await adminDb
          .collection("supply_history")
          .where("teamId", "==", supplyData.teamId)
          .where("name", "==", supplyData.name)
          .where("category", "==", supplyData.category)
          .limit(1)
          .get();

        if (!existingHistorySnapshot.empty) {
          const existingHistoryDoc = existingHistorySnapshot.docs[0];
          await existingHistoryDoc.ref.update({
            totalConsumed:
              (existingHistoryDoc.data().totalConsumed || 0) +
              (history.totalConsumed || 0),
            reviewCount:
              (existingHistoryDoc.data().reviewCount || 0) +
              history.reviewCount,
            hasReviews:
              history.hasReviews || existingHistoryDoc.data().hasReviews,
            archivedAt: history.archivedAt,
            lastUsedDate: history.lastUsedDate,
            purchaseLocations: Array.from(
              new Set([
                ...(existingHistoryDoc.data().purchaseLocations || []),
                ...history.purchaseLocations,
              ])
            ),
          });
        } else {
          await adminDb
            .collection("supply_history")
            .doc(history.id)
            .set(history);
        }

        await supplyDoc.ref.update({
          isArchived: true,
        });

        archivedSupplies.push(supplyId);
      } catch (error) {
        console.error(`Failed to archive supply ${supplyDoc.id}:`, error);
        errors.push({
          id: supplyDoc.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: "Auto-archive completed",
      archived: archivedSupplies.length,
      archivedSupplies,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (_error: unknown) {
    console.error("Auto-archive error:", _error);
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
