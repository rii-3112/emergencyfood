import { getServerUser } from "@/utils/auth/server";
import { fetchHistoriesFromDB } from "@/utils/data/server";
import { redirect } from "next/navigation";
import SupplyHistoryView from "./_components/SupplyHistoryView";

export default async function SupplyHistoryPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!user.teamId) {
    redirect("/settings?tab=team");
  }

  const histories = await fetchHistoriesFromDB(user.teamId);

  return (
    <div className='container mx-auto py-8 min-h-screen'>
      <header className='mb-8 border-gray-300 border-b pb-4'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>備蓄履歴</h1>
        <p className='text-gray-600'>過去に備蓄していたものを確認</p>
      </header>
      <SupplyHistoryView initialHistories={histories} user={user} />
    </div>
  );
}
