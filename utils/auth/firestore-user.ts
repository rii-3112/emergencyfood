import { adminDb } from "@/utils/firebase/admin";

/** Firestore users ドキュメントを確保（未作成なら作成） */
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
