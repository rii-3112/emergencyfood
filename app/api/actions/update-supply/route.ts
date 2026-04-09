// app/api/actions/update-supply/route.ts
import { FieldValue } from "firebase-admin/firestore";
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
      existingSupplyData?.teamId !== decodedToken.teamId
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
