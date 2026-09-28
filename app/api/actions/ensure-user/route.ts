import { NextResponse } from "next/server";

import { requireApiUser } from "@/utils/auth/server";

/** 後方互換: 旧 ensure-user は Turso のみで完結するため no-op */
export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
