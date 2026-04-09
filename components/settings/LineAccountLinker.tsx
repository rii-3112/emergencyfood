//components/settings/LineAccountLinker.tsx
"use client";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { AppUser } from "@/types";
import { db } from "@/utils/firebase";
import { setTeamIdClaim } from "@/utils/firebase/team-claims";

interface LineAccountLinkerProps {
  currentUser: AppUser;
}

export default function LineAccountLinker({
  currentUser,
}: LineAccountLinkerProps) {
  const [lineUserIdFromFirestore, setLineUserIdFromFirestore] = useState<
    string | null
  >(null);
  const [lineAuthCode, setLineAuthCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const _firebaseAuth = getAuth();

  //firebaseに確認
  useEffect(() => {
    const fetchLineUserId = async () => {
      if (!currentUser?.uid) return;

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setLineUserIdFromFirestore(userDocSnap.data()?.lineUserId || null);
        }
      } catch (_e) {
        setError("ユーザー情報の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchLineUserId();
    }
  }, [currentUser]);

  //LINE連携
  const handleLinkLineAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentUser?.uid) {
      setError("ログインが必要です。");
      return;
    }
    if (!lineAuthCode) {
      setError("認証コードを入力してください。");
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/actions/link-line-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ authCode: lineAuthCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "LINEアカウントの連携に失敗しました。");
      }

      setSuccessMessage(
        result.message || "LINEアカウントが正常に連携されました！"
      );
      setLineUserIdFromFirestore(result.lineUserId);

      await currentUser.getIdToken(true);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "不明なエラー";
      setError(`LINEアカウントの連携に失敗しました: ${errorMessage}`);
    }
  };

  //LINE連携解除
  const handleUnlinkLineAccount = async () => {
    setShowUnlinkConfirm(true);
  };

  const confirmUnlink = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!currentUser?.uid) {
      setError("ログインが必要です。");
      return;
    }
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/actions/unlink-line-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: currentUser.uid }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "LINEアカウントの連携解除に失敗しました。"
        );
      }

      setSuccessMessage(
        result.message || "LINEアカウントの連携を解除しました。"
      );
      setLineUserIdFromFirestore(null);

      await currentUser.getIdToken(true);
      await setTeamIdClaim();
      await currentUser.getIdToken(true);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "不明なエラー";
      setError(`LINEアカウントの連携解除に失敗しました: ${errorMessage}`);
    } finally {
      setShowUnlinkConfirm(false);
    }
  };

  if (loading) {
    return <div className='text-center py-8'>読み込み中...</div>;
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-xl font-semibold text-gray-900 mb-4'>LINE通知設定</h2>

      {error && (
        <div className='p-3 bg-red-200 text-black border rounded-md'>
          {error}
        </div>
      )}

      {!error && successMessage && (
        <div className='p-3 bg-green-50 text-green-800 border border-green-200 rounded-md'>
          {successMessage}
        </div>
      )}

      {lineUserIdFromFirestore ? (
        <div>
          <div className='flex items-start space-x-3'>
            <div className='flex-shrink-0'>
              <svg
                className='h-6 w-6 text-gray-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  d='M5 13l4 4L19 7'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className='flex-1'>
              <h3 className='text-sm font-medium text-gray-900'>
                LINEアカウントが連携されています
              </h3>
              <div className='mt-2 text-sm text-gray-700'>
                <p>SonaBaseからの通知をLINEで受け取ることができます。</p>
              </div>
            </div>
          </div>

          <div className='mt-4'>
            <button
              className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors'
              onClick={handleUnlinkLineAccount}
            >
              連携解除
            </button>
          </div>
        </div>
      ) : (
        <div className='space-y-6'>
          <div className='p-6 bg-gray-100 border border-gray-300 rounded-lg'>
            <div className='flex items-start space-x-3'>
              <div className='flex-shrink-0'>
                <svg
                  className='h-6 w-6 text-gray-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <div className='flex-1'>
                <h3 className='text-sm font-medium text-gray-900'>
                  LINEアカウントの連携
                </h3>
                <div className='mt-2 text-sm text-gray-700'>
                  <p>
                    LINEアカウントを連携すると、SonaBaseからの通知をLINEで受け取ることができます。
                  </p>
                  <p className='mt-1'>
                    連携するには、LINEアプリでSonaBaseの公式アカウントを友達追加し、認証コードを取得してください。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form className='space-y-4' onSubmit={handleLinkLineAccount}>
            <div>
              <label
                className='block text-sm font-medium text-gray-900 mb-2'
                htmlFor='lineAuthCode'
              >
                LINE認証コード
              </label>
              <input
                required
                className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black'
                id='lineAuthCode'
                placeholder='認証コードを入力してください'
                type='text'
                value={lineAuthCode}
                onChange={(e) => setLineAuthCode(e.target.value)}
              />
            </div>

            <button
              className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors'
              type='submit'
            >
              連携する
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        cancelText='キャンセル'
        confirmText='連携解除'
        confirmVariant='danger'
        isOpen={showUnlinkConfirm}
        message='LINEアカウントの連携を解除しますか？'
        title='連携解除の確認'
        onClose={() => setShowUnlinkConfirm(false)}
        onConfirm={confirmUnlink}
      />
    </div>
  );
}
