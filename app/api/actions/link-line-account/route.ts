// app/api/actions/link-line-account/route.ts
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { requireApiUser, syncUserLineUserId } from "@/utils/auth/server";
import { adminDb } from "@/utils/firebase/admin";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firebaseUid = user.uid;
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

    await syncUserLineUserId(firebaseUid, lineUserId);

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
