import { LoadingSpinner } from "@/components/ui";

export default function Loading() {
  return (
    <div className='flex flex-col justify-center items-center min-h-[50vh]'>
      <LoadingSpinner size='lg' />
      <p className='text-gray-600 mt-4'>ページを読み込み中...</p>
    </div>
  );
}
