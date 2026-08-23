import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { account as accountTable, user as userTable } from "@/lib/auth-schema";
import { db } from "@/lib/db";

export interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
  lineUserId?: string | null;
  gender?: string;
}

function mapSessionUser(sessionUser: {
  id: string;
  email: string;
  name: string;
  teamId?: string | null;
  lineUserId?: string | null;
  gender?: string | null;
}): ServerUser {
  return {
    uid: sessionUser.id,
    email: sessionUser.email,
    displayName: sessionUser.name || undefined,
    teamId: sessionUser.teamId ?? undefined,
    lineUserId: sessionUser.lineUserId ?? null,
    gender: sessionUser.gender ?? undefined,
  };
}

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

export async function syncUserTeamId(uid: string, teamId: string | null) {
  await db
    .update(userTable)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(userTable.id, uid));
}

export async function userHasPasswordAccount(userId: string): Promise<boolean> {
  const credentialAccount = await db.query.account.findFirst({
    where: and(
      eq(accountTable.userId, userId),
      eq(accountTable.providerId, "credential")
    ),
    columns: { id: true },
  });
  return Boolean(credentialAccount);
}

export async function syncUserLineUserId(
  uid: string,
  lineUserId: string | null
) {
  await db
    .update(userTable)
    .set({ lineUserId, updatedAt: new Date() })
    .where(eq(userTable.id, uid));
}
