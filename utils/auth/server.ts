import { auth } from "@/lib/auth";
import { adminDb } from "@/utils/firebase/admin";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/lib/auth-schema";
import { db } from "@/lib/db";

export interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
  lineUserId?: string | null;
}

function mapSessionUser(sessionUser: {
  id: string;
  email: string;
  name: string;
  teamId?: string | null;
  lineUserId?: string | null;
}): ServerUser {
  return {
    uid: sessionUser.id,
    email: sessionUser.email,
    displayName: sessionUser.name || undefined,
    teamId: sessionUser.teamId ?? undefined,
    lineUserId: sessionUser.lineUserId ?? null,
  };
}

/**
 * Server Components / Route Handlers: Better Auth セッションからユーザーを取得
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return null;
    return mapSessionUser(session.user);
  } catch (error) {
    console.error("Server auth error:", error);
    return null;
  }
}

/**
 * API Route: Request の Cookie からセッションユーザーを取得
 */
export async function requireApiUser(req: Request): Promise<ServerUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (!session?.user) return null;
    return mapSessionUser(session.user);
  } catch (error) {
    console.error("API auth error:", error);
    return null;
  }
}

export async function requireAuth(): Promise<ServerUser> {
  const user = await getServerUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/** Better Auth + Firestore の teamId を同期 */
export async function syncUserTeamId(uid: string, teamId: string | null) {
  await db
    .update(userTable)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(userTable.id, uid));

  await adminDb.collection("users").doc(uid).set({ teamId }, { merge: true });
}

/** Better Auth + Firestore の lineUserId を同期 */
export async function syncUserLineUserId(
  uid: string,
  lineUserId: string | null
) {
  await db
    .update(userTable)
    .set({ lineUserId, updatedAt: new Date() })
    .where(eq(userTable.id, uid));

  await adminDb
    .collection("users")
    .doc(uid)
    .set({ lineUserId }, { merge: true });
}

/** Firestore users ドキュメントを確保 */
export async function ensureFirestoreUser(params: {
  uid: string;
  email: string;
  displayName?: string | null;
  teamId?: string | null;
}) {
  const ref = adminDb.collection("users").doc(params.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: params.email,
      displayName: params.displayName ?? null,
      teamId: params.teamId ?? null,
      lineUserId: null,
      createdAt: new Date().toISOString(),
    });
  }
}
