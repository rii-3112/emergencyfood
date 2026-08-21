// app/api/actions/update-supply/route.ts
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
    const { supplyId, updates } = await req.json();

    if (!supplyId || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Supply ID and update data are required" },
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
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: `Supply item ${supplyId} updated successfully.`,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to update supply item.";
    if (errorMessage.includes("Unauthorized")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
