import { adminAuth } from "@/utils/firebase/admin";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
}

/**
 * サーバーサイドでFirebase認証トークンを検証し、ユーザー情報を取得
 * 注意: この実装は開発用です。本番環境ではより安全な認証方法を推奨
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies();
    const idToken = cookieStore.get("idToken")?.value;

    if (!idToken) {
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // カスタムクレームからチームIDを取得
    const teamId = decodedToken.teamId as string | undefined;

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      displayName: decodedToken.name,
      teamId,
    };
  } catch (error) {
    console.error("Server auth error:", error);
    return null;
  }
}

/**
 * リクエストヘッダーからFirebase認証トークンを検証
 */
export async function getServerUserFromRequest(
  request: NextRequest
): Promise<ServerUser | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const teamId = decodedToken.teamId as string | undefined;

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      displayName: decodedToken.name,
      teamId,
    };
  } catch (error) {
    console.error("Server auth error:", error);
    return null;
  }
}

/**
 * 認証が必要なページで使用する認証チェック
 */
export async function requireAuth(): Promise<ServerUser> {
  const user = await getServerUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
