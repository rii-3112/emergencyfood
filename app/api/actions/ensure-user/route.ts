import { NextResponse } from "next/server";

import { ensureFirestoreUser, requireApiUser } from "@/utils/auth/server";

export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureFirestoreUser({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    teamId: user.teamId ?? null,
  });

  return NextResponse.json({ ok: true });
}
