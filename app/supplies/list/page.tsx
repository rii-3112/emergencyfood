import { getServerUser } from "@/utils/auth/server";
import { fetchSuppliesFromDB, fetchTeamFromDB } from "@/utils/data/server";
import { parseSupplyFocus } from "@/utils/homeOverview";
import { redirect } from "next/navigation";
import SupplyListView from "./_components/SupplyListView";

export const dynamic = "force-dynamic";

export default async function SupplyListPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const user = await getServerUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.teamId) {
    redirect("/settings?tab=team");
  }

  const [supplies, team] = await Promise.all([
    fetchSuppliesFromDB(user.teamId, false),
    fetchTeamFromDB(user.teamId),
  ]);

  return (
    <div className='container mx-auto py-8 min-h-screen'>
      <header className='mb-8 border-[#F39800] border-b pb-4'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>備蓄品リスト</h1>
        <p className='text-gray-600'>登録された備蓄品の一覧</p>
      </header>

      <SupplyListView
        focus={parseSupplyFocus(focus)}
        initialSupplies={supplies}
        initialTeam={team}
        user={user}
      />
    </div>
  );
}
