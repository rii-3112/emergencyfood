import { NextResponse } from "next/server";

import { requireApiUser, syncUserLineUserId } from "@/utils/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUserLineUserId(user.uid, null);

    return NextResponse.json({
      message: "LINE account unlinked successfully!",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
