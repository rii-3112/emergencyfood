"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import { saveAuthTokenToCookie } from "@/utils/auth/cookies";
import { navigateAfterRegistrationProfile } from "@/utils/auth/postRegistrationNavigate";
import {
  API_ENDPOINTS,
  APP_ROUTES,
  ERROR_MESSAGES,
  PROFILE_GENDER_OPTIONS,
} from "@/utils/constants";
import { auth, db } from "@/utils/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

export default function RegisterProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = useMemo(() => searchParams.get("invite"), [searchParams]);
  const { user, loading: authLoading } = useAuth(false);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setCheckingProfile(false);
      return;
    }

    const uid = user.uid;

    let cancelled = false;

    async function ensureProfileGate() {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data();
        if (!cancelled && data?.gender) {
          router.replace(APP_ROUTES.HOME);
          return;
        }
      } catch {
        /* 初回のみのガード */
      } finally {
        if (!cancelled) {
          setCheckingProfile(false);
        }
      }
    }

    ensureProfileGate();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.displayName) {
      return;
    }
    setName((current) => (current === "" ? (user.displayName ?? "") : current));
  }, [user?.displayName]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (!gender) {
      setError("性別を選択してください");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError(ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile(currentUser, { displayName: trimmed });

      const idToken = await currentUser.getIdToken();
      const res = await fetch(API_ENDPOINTS.UPDATE_USER_NAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: trimmed,
          gender,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : "プロフィールの保存に失敗しました"
        );
        return;
      }

      await currentUser.getIdToken(true);
      saveAuthTokenToCookie(currentUser);

      await navigateAfterRegistrationProfile(
        currentUser,
        router,
        trimmed,
        inviteCode
      );
    } catch {
      setError(ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || checkingProfile || !user) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-600'>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className='space-y-4 sm:space-y-6 max-w-md mx-auto w-full px-4 sm:px-0'>
      <h1 className='text-2xl sm:text-4xl font-bold text-gray-900 text-center mb-4 sm:mb-6'>
        プロフィール登録
      </h1>
      <p className='text-sm text-gray-600 text-center leading-relaxed'>
        アカウント作成が完了しました。表示名と性別を入力してください。性別は、あなたに必要な備蓄品を推奨するために使用します。のちほど、設定からも変更できます。
      </p>

      {inviteCode && (
        <div className='border-2 border-orange-200 rounded p-3'>
          <p className='text-sm font-semibold text-orange-800'>
            グループへの招待があります
          </p>
          <p className='text-xs text-black mt-1'>
            プロフィール登録後、自動でグループに参加します。
          </p>
        </div>
      )}

      {error && (
        <div className='bg-red-200 border text-black px-3 sm:px-4 py-3 rounded-md text-sm'>
          {error}
        </div>
      )}

      <form className='space-y-4' onSubmit={handleSubmit}>
        <div>
          <label
            className='block text-gray-900 text-sm font-medium mb-1 sm:mb-2'
            htmlFor='profile-name'
          >
            名前
          </label>
          <input
            required
            disabled={isSubmitting}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base disabled:opacity-50'
            id='profile-name'
            placeholder='表示名'
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label
            className='block text-gray-900 text-sm font-medium mb-1 sm:mb-2'
            htmlFor='profile-gender'
          >
            性別（必要な備蓄品を推奨するため）
          </label>
          <select
            required
            disabled={isSubmitting}
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base bg-white disabled:opacity-50'
            id='profile-gender'
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value=''>選択してください</option>
            {PROFILE_GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-black text-white font-semibold py-3 px-6 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? "保存しています..." : "次へ進む"}
        </button>
      </form>

      <p className='text-center text-xs text-gray-500'>
        表示名・性別とも、{" "}
        <Link
          href='/settings?tab=account'
          className='text-black underline underline-offset-2 hover:text-gray-700'
        >
          設定
        </Link>{" "}
        から後ほど変更することができます。
      </p>
    </div>
  );
}
