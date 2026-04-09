"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[50vh] p-8'>
      <div className='text-center max-w-md'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          エラーが発生しました
        </h2>
        <p className='text-gray-600 mb-6'>
          申し訳ございませんが、予期しないエラーが発生しました。
          しばらく待ってから再度お試しください。
        </p>
        <div className='space-y-3'>
          <button
            className='w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium'
            onClick={reset}
          >
            再試行
          </button>
          <button
            className='w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium'
            onClick={() => (window.location.href = "/")}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
