// components/auth/RegisterForm.tsx
"use client";
import { saveAuthTokenToCookie } from "@/utils/auth/cookies";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/utils/constants";
import { auth, db } from "@/utils/firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = useMemo(() => searchParams.get("invite"), [searchParams]);

  // Googleで登録
  const handleGoogleRegister = async () => {
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
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          router.push("/auth/login");
          return;
        }

        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || "ゲスト",
          teamId: null,
        });

        const idToken = await user.getIdToken();
        const res = await fetch(API_ENDPOINTS.SET_CUSTOM_CLAIMS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            teamId: null,
            idToken: idToken,
          }),
        });

        if (!res.ok) {
          setError("登録処理に失敗しました");
          return;
        }

        await user.getIdToken(true);
        try {
          if (inviteCode) {
            const joinResponse = await fetch("/api/team/join-by-invite", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user.getIdToken()}`,
              },
              body: JSON.stringify({ inviteCode }),
            });

            const joinResult = await joinResponse.json();

            if (joinResponse.ok && joinResult.teamId) {
              router.push("/supplies/list");
            } else {
              throw new Error("招待チームへの参加に失敗しました");
            }
          } else {
            const displayName = user.displayName || "ゲスト";
            const teamResponse = await fetch(API_ENDPOINTS.CREATE_TEAM, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user.getIdToken()}`,
              },
              body: JSON.stringify({
                teamName: `${displayName}の家族`,
                teamPassword: "",
              }),
            });

            const teamResult = await teamResponse.json();

            if (teamResponse.ok && teamResult.teamId) {
              await user.getIdToken(true);
              router.push(`/supplies/list?teamId=${teamResult.teamId}`);
              router.refresh();
            } else {
              router.push("/supplies/list");
            }
          }
        } catch (teamError) {
          console.error("チーム処理エラー:", teamError);
          router.push("/settings?tab=team");
        }
      }
    } catch (_error: unknown) {
      if (_error instanceof Error && "code" in _error) {
        switch (_error.code) {
          case "auth/popup-closed-by-user":
            setError("登録がキャンセルされました");
            break;
          case "auth/popup-blocked":
            setError(
              "ポップアップがブロックされました。ブラウザの設定を確認してください。"
            );
            break;
          case "auth/account-exists-with-different-credential":
            setError("このメールアドレスは既に別の方法で登録されています");
            break;
          default:
            setError("Google登録に失敗しました");
            break;
        }
      } else {
        setError("Google登録に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // メール/パスワードで登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name.trim(),
        });

        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          displayName: name.trim(),
          teamId: null,
        });

        const idToken = await userCredential.user.getIdToken();
        const res = await fetch(API_ENDPOINTS.SET_CUSTOM_CLAIMS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userCredential.user.uid,
            teamId: null,
            idToken: idToken,
          }),
        });
        if (!res.ok) {
          setError("クレームの同期に失敗しました");
          return;
        }
        await userCredential.user.getIdToken(true);

        saveAuthTokenToCookie(userCredential.user);

        try {
          if (inviteCode) {
            const joinResponse = await fetch("/api/team/join-by-invite", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await userCredential.user.getIdToken()}`,
              },
              body: JSON.stringify({ inviteCode }),
            });

            const joinResult = await joinResponse.json();

            if (joinResponse.ok && joinResult.teamId) {
              router.push("/supplies/list");
            } else {
              throw new Error("招待チームへの参加に失敗しました");
            }
          } else {
            const teamResponse = await fetch(API_ENDPOINTS.CREATE_TEAM, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await userCredential.user.getIdToken()}`,
              },
              body: JSON.stringify({
                teamName: `${name.trim()}の家族`, // Google登録と同じデフォルト名
                teamPassword: "",
              }),
            });

            const teamResult = await teamResponse.json();

            if (teamResponse.ok && teamResult.teamId) {
              await userCredential.user.getIdToken(true);
              router.push("/supplies/list");
              router.refresh();
            } else {
              router.push("/settings?tab=team");
            }
          }
        } catch (teamError) {
          console.error("チーム処理エラー:", teamError);
          router.push("/settings?tab=team");
        }
      }
    } catch (_error: unknown) {
      if (_error instanceof Error && "code" in _error) {
        if (_error.code === "auth/email-already-in-use") {
          setError(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
        } else if (_error.code === "auth/invalid-email") {
          setError(ERROR_MESSAGES.INVALID_EMAIL);
        } else if (_error.code === "auth/weak-password") {
          setError(ERROR_MESSAGES.WEAK_PASSWORD);
        } else {
          setError(ERROR_MESSAGES.REGISTRATION_FAILED);
        }
      } else {
        setError(ERROR_MESSAGES.REGISTRATION_FAILED);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-4 sm:space-y-6 max-w-md mx-auto w-full px-4 sm:px-0'>
      <h1 className='text-2xl sm:text-4xl font-bold text-gray-900 text-center mb-4 sm:mb-6'>
        ユーザー登録
      </h1>

      {inviteCode && (
        <div className='border-2 border-orange-200 rounded p-3'>
          <div className='flex items-center'>
            <div>
              <p className='text-sm font-semibold text-orange-800'>
                グループへの招待を受けています
              </p>
              <p className='text-xs text-black'>
                登録後、自動的にグループに参加します
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className='bg-red-200 border text-black px-3 sm:px-4 py-3 rounded-md text-sm'>
          {error}
        </div>
      )}

      {/* Googleで登録ボタン */}
      <button
        type='button'
        onClick={handleGoogleRegister}
        disabled={isLoading}
        className='w-full bg-white text-gray-700 font-semibold py-3 px-6 rounded-md border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed'
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
        <div>Googleで登録</div>
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
            htmlFor='name'
          >
            名前
          </label>
          <input
            required
            disabled={isLoading}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base disabled:opacity-50'
            id='name'
            placeholder='表示名を入力'
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
            placeholder='6文字以上のパスワード'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label
            className='block text-gray-900 text-sm font-medium mb-1 sm:mb-2'
            htmlFor='confirmPassword'
          >
            パスワード再入力
          </label>
          <input
            required
            disabled={isLoading}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base disabled:opacity-50'
            id='confirmPassword'
            placeholder='パスワード再入力'
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          className='w-full bg-black text-white font-semibold py-3 px-6 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 text-base disabled:opacity-50 disabled:cursor-not-allowed'
          type='submit'
          disabled={isLoading}
        >
          {isLoading ? "登録中..." : "メールアドレスで登録"}
        </button>
      </form>
    </div>
  );
}
