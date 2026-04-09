"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[50vh] p-8'>
      <div className='text-center max-w-md'>
        <h1 className='text-6xl font-bold text-gray-900 mb-4'>404</h1>
        <h2 className='text-2xl font-semibold text-gray-700 mb-4'>
          ページが見つかりません
        </h2>
        <p className='text-gray-600 mb-8'>
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <div className='space-y-3'>
          <Link
            className='inline-block w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-center'
            href='/'
          >
            ホームに戻る
          </Link>
          <button
            className='w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium'
            onClick={handleBack}
          >
            前のページに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
