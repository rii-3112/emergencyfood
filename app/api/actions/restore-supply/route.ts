// app/api/actions/restore-supply/route.ts
import { requireApiUser } from "@/utils/auth/server";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

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

    const supplyDocRef = adminDb.collection("supplies").doc(supplyId);

    const supplyDocSnap = await supplyDocRef.get();
    if (!supplyDocSnap.exists) {
      return NextResponse.json(
        { error: "Supply item not found" },
        { status: 404 }
      );
    }
    const existingSupplyData = supplyDocSnap.data();

    if (
      existingSupplyData?.uid !== uid ||
      existingSupplyData?.teamId !== user.teamId
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You do not own this supply item or belong to this team.",
        },
        { status: 403 }
      );
    }

    await supplyDocRef.update({
      isArchived: false,
      restoredAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: `Supply item ${supplyId} restored successfully.`,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to restore supply item.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
