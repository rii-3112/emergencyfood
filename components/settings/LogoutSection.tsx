"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth, useLinkedAccounts } from "@/hooks";
import { UI_CONSTANTS } from "@/utils/constants";

function getReLoginMessage(
  hasPasswordAccount: boolean,
  hasGoogleAccount: boolean
): string {
  if (hasPasswordAccount && hasGoogleAccount) {
    return "再度ログインする際は、メールアドレスとパスワード、またはGoogleアカウントが使えます。";
  }
  if (hasGoogleAccount) {
    return "再度ログインする際は、Googleアカウントが必要です。";
  }
  return "再度ログインする際は、メールアドレスとパスワードが必要です。";
}

export default function LogoutSection() {
  const { logout } = useAuth();
  const { hasPasswordAccount, hasGoogleAccount, loading: linkedAccountsLoading } =
    useLinkedAccounts();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      router.push("/");
    } catch (_error) {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <h2 className='text-xl font-semibold text-gray-900 mb-4'>
        {UI_CONSTANTS.LOGOUT}
      </h2>
      <div className='flex items-start space-x-3'>
        <div className='flex-1'>
          <div className='mt-2 text-sm text-gray-700'>
            <p>
              ログアウトすると、現在のセッションが終了し、ログイン画面に戻ります。
            </p>
            <p className='mt-1'>
              {linkedAccountsLoading
                ? "再度ログイン方法は、ご利用中のアカウント設定に応じて表示されます。"
                : getReLoginMessage(hasPasswordAccount, hasGoogleAccount)}
            </p>
          </div>
        </div>
      </div>

      {showConfirm ? (
        <div className='space-y-4'>
          <div className='p-4 bg-red-200 border rounded-lg'>
            <p className='text-sm text-black'>{UI_CONSTANTS.CONFIRM_LOGOUT}</p>
          </div>

          <div className='flex space-x-3'>
            <button
              className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors'
              disabled={loading}
              onClick={handleLogout}
            >
              {loading ? UI_CONSTANTS.PROCESSING : "ログアウトする"}
            </button>
            <button
              className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors'
              disabled={loading}
              onClick={() => setShowConfirm(false)}
            >
              {UI_CONSTANTS.CANCEL}
            </button>
          </div>
        </div>
      ) : (
        <button
          className='px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium'
          onClick={() => setShowConfirm(true)}
        >
          {UI_CONSTANTS.LOGOUT}
        </button>
      )}
    </div>
  );
}
