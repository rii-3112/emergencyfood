// app/api/actions/unlink-line-account/route.ts
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

    const firebaseUid = decodedToken.uid;

    const userDocRef = adminDb.collection("users").doc(firebaseUid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      return NextResponse.json(
        { error: "User not found in Firestore." },
        { status: 404 }
      );
    }

    await userDocRef.update({
      lineUserId: FieldValue.delete(),
      lineLinkedAt: FieldValue.delete(),
    });

    const newClaims = { ...decodedToken.claims };
    delete newClaims.lineUserId;
    await adminAuth.setCustomUserClaims(firebaseUid, newClaims);

    return NextResponse.json({
      message: "LINE account unlinked successfully!",
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
