// app/api/actions/archive-to-history/route.ts
import { requireApiUser } from "@/utils/auth/server";
import { NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";
import { convertSupplyToHistory } from "@/utils/supplyHistoryHelpers";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.uid;
    const { supplyId } = await req.json();

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

    const reviewsSnapshot = await adminDb
      .collection("supplyReviews")
      .where("supplyId", "==", supplyId)
      .get();

    const reviews = reviewsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const history = await convertSupplyToHistory(
      { ...supply, id: supplyId } as any,
      uid,
      reviews as any
    );

    const existingHistorySnapshot = await adminDb
      .collection("supply_history")
      .where("teamId", "==", supply?.teamId)
      .where("name", "==", supply?.name)
      .where("category", "==", supply?.category)
      .limit(1)
      .get();

    if (!existingHistorySnapshot.empty) {
      const existingHistoryDoc = existingHistorySnapshot.docs[0];
      await existingHistoryDoc.ref.update({
        totalConsumed:
          (existingHistoryDoc.data().totalConsumed || 0) +
          (history.totalConsumed || 0),
        reviewCount:
          (existingHistoryDoc.data().reviewCount || 0) + history.reviewCount,
        hasReviews: history.hasReviews || existingHistoryDoc.data().hasReviews,
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
      await adminDb.collection("supply_history").doc(history.id).set(history);
    }

    await supplyRef.update({
      isArchived: true,
    });

    return NextResponse.json({
      message: "Supply archived to history successfully",
      history,
    });
  } catch (_error: unknown) {
    console.error("Archive to history error:", _error);
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
