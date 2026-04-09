import { getServerUser } from "@/utils/auth/server";
import {
  fetchDisasterBoardFromDB,
  fetchHandbookChecklistFromDB,
  fetchTeamFromDB,
} from "@/utils/data/server";
import { redirect } from "next/navigation";
import HandbookClient from "./_components/HandbookClient";

export default async function HandbookPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!user.teamId) {
    redirect("/settings?tab=team");
  }

  const [disasterBoardData, teamData, initialChecklistData] = await Promise.all(
    [
      fetchDisasterBoardFromDB(user.teamId),
      fetchTeamFromDB(user.teamId),
      fetchHandbookChecklistFromDB(user.teamId),
    ]
  );

  return (
    <div className='container mx-auto py-8 min-h-screen'>
      <header className='mb-8 border-gray-300 border-b pb-4'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          防災ハンドブック
        </h1>
        <p className='text-gray-600'>災害に備えるためにみんなで確認</p>
      </header>
      <HandbookClient
        initialDisasterBoardData={disasterBoardData}
        initialTeamData={teamData}
        initialChecklistData={initialChecklistData}
        user={user}
      />
    </div>
  );
}
