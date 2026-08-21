// app/api/actions/unlink-line-account/route.ts
import { FieldValue } from "firebase-admin/firestore";
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

    await syncUserLineUserId(firebaseUid, null);

    return NextResponse.json({
      message: "LINE account unlinked successfully!",
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
