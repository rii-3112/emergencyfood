import { NextResponse } from "next/server";

import {
  deleteLineAuthCode,
  findLineAuthCodeByCode,
} from "@/lib/repositories/line-auth";
import { requireApiUser, syncUserLineUserId } from "@/utils/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { authCode } = await req.json();

    if (!authCode) {
      return NextResponse.json(
        { error: "Authentication code is required" },
        { status: 400 }
      );
    }

    const authCodeRecord = await findLineAuthCodeByCode(authCode);
    if (!authCodeRecord) {
      return NextResponse.json(
        { error: "Invalid or expired authentication code." },
        { status: 400 }
      );
    }

    if (authCodeRecord.expireAt.getTime() < Date.now()) {
      await deleteLineAuthCode(authCodeRecord.lineUserId);
      return NextResponse.json(
        { error: "Authentication code has expired." },
        { status: 400 }
      );
    }

    const lineUserId = authCodeRecord.lineUserId;
    await syncUserLineUserId(user.uid, lineUserId);
    await deleteLineAuthCode(lineUserId);

    return NextResponse.json({
      message: "LINE account linked successfully!",
      lineUserId,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
