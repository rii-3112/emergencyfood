import { getServerUser } from "@/utils/auth/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomeHubPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!user.teamId) {
    redirect("/settings?tab=team");
  }

  return (
    <div className='container mx-auto max-w-2xl py-8 min-h-screen'>
      <header className='mb-10 text-center'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>SonaBase</h1>
        <p className='text-gray-600 text-sm sm:text-base'>
          家族の防災に役立つ機能を提供します
        </p>
      </header>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Link
          className='group block rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:shadow-md'
          href='/supplies/list'
        >
          <h2 className='text-lg font-semibold text-gray-900 mb-2 group-hover:text-black'>
            備蓄品を管理
          </h2>
          <p className='text-sm text-gray-600 leading-relaxed'>
            備蓄品をリスト化します
          </p>
        </Link>

        <Link
          className='group block rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:shadow-md'
          href='/handbook'
        >
          <h2 className='text-lg font-semibold text-gray-900 mb-2 group-hover:text-black'>
            防災ハンドブック
          </h2>
          <p className='text-sm text-gray-600 leading-relaxed'>
            備蓄品のチェックリストやハザードマップなどを家族で確認しましょう
          </p>
        </Link>
      </div>
    </div>
  );
}
