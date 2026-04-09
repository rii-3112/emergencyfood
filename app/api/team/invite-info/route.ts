import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inviteCode = searchParams.get("code");

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const inviteDoc = await adminDb.collection("invites").doc(inviteCode).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data();

    if (inviteData?.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { error: "Invite code has expired" },
        { status: 410 }
      );
    }

    if (inviteData?.used) {
      return NextResponse.json(
        { error: "Invite code has already been used" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      teamId: inviteData?.teamId,
      teamName: inviteData?.teamName,
    });
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
