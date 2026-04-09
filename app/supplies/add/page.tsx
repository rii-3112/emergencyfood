import { getServerUser } from "@/utils/auth/server";
import { redirect } from "next/navigation";
import SupplyAddForm from "./_components/SupplyAddForm";

export default async function SupplyAddPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!user.teamId) {
    redirect("/settings?tab=team");
  }

  return (
    <div className='container mx-auto py-8 min-h-screen'>
      <header className='mb-8 border-gray-300 border-b pb-4'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          新しい備蓄品を登録
        </h1>
        <p className='text-gray-600'>備蓄品の詳細情報を入力</p>
      </header>

      <SupplyAddForm user={user} />
    </div>
  );
}
