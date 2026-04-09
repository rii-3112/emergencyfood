// app/api/actions/archive-supply/route.ts
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
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (_error) {
      return NextResponse.json(
        { error: "Invalid or expired ID token" },
        { status: 403 }
      );
    }

    const { supplyId } = await req.json();

    if (!supplyId) {
      return NextResponse.json(
        { error: "Supply ID is required" },
        { status: 400 }
      );
    }

    const supplyDocRef = adminDb.collection("supplies").doc(supplyId);

    await supplyDocRef.update({
      isArchived: true,
      archivedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: `Supply item ${supplyId} archived successfully.`,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error
        ? _error?.message
        : "Failed to archive supply item.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
