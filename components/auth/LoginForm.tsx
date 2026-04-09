// components/auth/LoginForm.tsx
"use client";
import { saveAuthTokenToCookie } from "@/utils/auth/cookies";
import { ERROR_MESSAGES } from "@/utils/constants";
import { auth, db } from "@/utils/firebase";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePostLogin = async (user: any) => {
    saveAuthTokenToCookie(user);

    let idTokenResult = await user.getIdTokenResult(true);
    let claimTeamId: string | null = idTokenResult.claims.teamId as
      | string
      | null;

    if (!claimTeamId) {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const firestoreTeamId: string | null = userDocSnap.exists()
        ? userDocSnap.data().teamId
        : null;

      if (firestoreTeamId) {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/setCustomClaims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            teamId: firestoreTeamId,
            idToken,
          }),
        });

        if (res.ok) {
          await user.getIdToken(true);
          idTokenResult = await user.getIdTokenResult();
          claimTeamId = idTokenResult.claims.teamId as string | null;
        }
      } else {
        // 既存ユーザーの互換性対応
      }
    }

    if (claimTeamId) {
      router.push("/supplies/list");
    } else {
      router.push("/settings?tab=team");
    }
  };

  // Googleログイン
  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        await handlePostLogin(user);
      }
    } catch (_error: unknown) {
      console.error("Google login error:", _error);
      if (_error instanceof Error && "code" in _error) {
        switch (_error.code) {
          case "auth/popup-closed-by-user":
            setError("ログインがキャンセルされました");
            break;
          case "auth/popup-blocked":
            setError(
              "ポップアップがブロックされました。ブラウザの設定を確認してください。"
            );
            break;
          case "auth/cancelled-popup-request":
            setError("ログインがキャンセルされました");
            break;
          case "auth/network-request-failed":
            setError(
              "ネットワークエラーが発生しました。インターネット接続を確認してください。"
            );
            break;
          default:
            setError("Googleログインに失敗しました");
            break;
        }
      } else {
        setError("Googleログインに失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // メール/パスワードログイン
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        await handlePostLogin(user);
      }
    } catch (_error: unknown) {
      if (_error instanceof Error && "code" in _error) {
        switch (_error.code) {
          case "auth/invalid-email":
            setError(ERROR_MESSAGES.INVALID_EMAIL);
            break;
          case "auth/user-disabled":
            setError(ERROR_MESSAGES.USER_DISABLED);
            break;
          case "auth/user-not-found":
          case "auth/wrong-password":
            setError(ERROR_MESSAGES.INVALID_CREDENTIALS);
            break;
          case "auth/too-many-requests":
            setError(ERROR_MESSAGES.TOO_MANY_REQUESTS);
            break;
          default:
            setError(ERROR_MESSAGES.LOGIN_FAILED);
            break;
        }
      } else {
        setError(ERROR_MESSAGES.LOGIN_FAILED);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-4 sm:space-y-6 max-w-md mx-auto w-full px-4 sm:px-0'>
      <h2 className='text-2xl sm:text-4xl font-bold pb-2 sm:pb-4 text-gray-900 text-center mb-4 sm:mb-6'>
        ログイン
      </h2>

      {error && (
        <div className='bg-red-200 border text-black px-3 sm:px-4 py-3 rounded text-sm'>
          {error}
        </div>
      )}

      <button
        type='button'
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className='w-full bg-white text-gray-700 font-semibold p-3 rounded-md border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        <svg className='w-5 h-5' viewBox='0 0 24 24'>
          <path
            fill='#4285F4'
            d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
          />
          <path
            fill='#34A853'
            d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
          />
          <path
            fill='#FBBC05'
            d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
          />
          <path
            fill='#EA4335'
            d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
          />
        </svg>
        <div>Googleでログイン</div>
      </button>

      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-gray-300' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <div className='px-2 bg-white text-gray-500'>または</div>
        </div>
      </div>

      <form className='space-y-3 sm:space-y-4' onSubmit={handleSubmit}>
        <div>
          <label
            className='block text-gray-900 text-sm font-medium mb-1 sm:mb-2'
            htmlFor='email'
          >
            メールアドレス
          </label>
          <input
            required
            disabled={isLoading}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base disabled:opacity-50'
            id='email'
            placeholder='example@email.com'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label
            className='block text-gray-900 text-sm font-medium mb-1 sm:mb-2'
            htmlFor='password'
          >
            パスワード
          </label>
          <input
            required
            disabled={isLoading}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base disabled:opacity-50'
            id='password'
            placeholder='パスワードを入力'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className='w-full bg-black text-white font-semibold py-3 px-6 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 text-base disabled:opacity-50 disabled:cursor-not-allowed'
          type='submit'
          disabled={isLoading}
        >
          {isLoading ? "ログイン中..." : "メールアドレスでログイン"}
        </button>
      </form>
    </div>
  );
}
