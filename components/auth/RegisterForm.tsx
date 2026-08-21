"use client";

import { authClient } from "@/lib/auth-client";
import { ERROR_MESSAGES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";

async function ensureUserDoc() {
  await fetch("/api/actions/ensure-user", { method: "POST" });
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = useMemo(() => searchParams.get("invite"), [searchParams]);

  const profileQuery = inviteCode
    ? `?invite=${encodeURIComponent(inviteCode)}`
    : "";

  const handleGoogleRegister = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `/auth/register/profile${profileQuery}`,
      });
    } catch (_error: unknown) {
      console.error("Google register error:", _error);
      setError("Google登録に失敗しました");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0] || "ユーザー",
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("exists")) {
          setError(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
        } else {
          setError(signUpError.message || ERROR_MESSAGES.REGISTRATION_FAILED);
        }
        return;
      }

      await ensureUserDoc();
      router.push(`/auth/register/profile${profileQuery}`);
      router.refresh();
    } catch (_error: unknown) {
      setError(ERROR_MESSAGES.REGISTRATION_FAILED);
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
                プロフィール登録後、自動的にグループに参加します
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
