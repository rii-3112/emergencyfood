// app/api/actions/link-line-account/route.ts
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
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
    const { authCode } = await req.json();

    if (!authCode) {
      return NextResponse.json(
        { error: "Authentication code is required" },
        { status: 400 }
      );
    }

    const lineAuthCodesRef = adminDb.collection("lineAuthCodes");
    const querySnapshot = await lineAuthCodesRef
      .where("code", "==", authCode)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: "Invalid or expired authentication code." },
        { status: 400 }
      );
    }

    const authCodeDoc = querySnapshot.docs[0];
    const authCodeData = authCodeDoc.data();
    const lineUserId = authCodeDoc.id;

    const expireAt = authCodeData.expireAt as Timestamp;
    if (expireAt && expireAt.toDate().getTime() < Date.now()) {
      await authCodeDoc.ref.delete();
      return NextResponse.json(
        { error: "Authentication code has expired." },
        { status: 400 }
      );
    }

    const userDocRef = adminDb.collection("users").doc(firebaseUid);
    await userDocRef.update({
      lineUserId: lineUserId,
      lineLinkedAt: FieldValue.serverTimestamp(),
    });

    await authCodeDoc.ref.delete();

    await adminAuth.setCustomUserClaims(firebaseUid, {
      ...decodedToken.claims,
      lineUserId: lineUserId,
    });

    return NextResponse.json({
      message: "LINE account linked successfully!",
      lineUserId: lineUserId,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error?.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
