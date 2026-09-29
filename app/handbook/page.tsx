import { getServerUser } from "@/utils/auth/server";
import {
  fetchDisasterBoardFromDB,
  fetchHandbookChecklistFromDB,
  fetchTeamFromDB,
} from "@/utils/data/server";
import { redirect } from "next/navigation";
import type { PlanSection } from "@/components/handbook/DisasterBoardCheckpoint";
import HandbookClient, {
  type HandbookCheckpoint,
} from "./_components/HandbookClient";

export const dynamic = "force-dynamic";

function parseCheckpoint(value: string | undefined): HandbookCheckpoint {
  if (value === "hazardmap" || value === "plans") return value;
  return "supplies";
}

function parsePlanSection(value: string | undefined): PlanSection | undefined {
  if (
    value === "sites" ||
    value === "routes" ||
    value === "safety" ||
    value === "agreements"
  ) {
    return value;
  }
  return undefined;
}

export default async function HandbookPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkpoint?: string;
    section?: string;
    add?: string;
  }>;
}) {
  const { checkpoint, section, add } = await searchParams;
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
      <header className='mb-8 border-[#F39800] border-b pb-4'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          防災ハンドブック
        </h1>
        <p className='text-gray-600'>災害に備えるためにみんなで確認</p>
      </header>
      <HandbookClient
        initialDisasterBoardData={disasterBoardData}
        initialTeamData={teamData}
        initialChecklistData={initialChecklistData}
        initialCheckpoint={parseCheckpoint(checkpoint)}
        initialPlanSection={parsePlanSection(section)}
        openPlanAdd={add === "1"}
        user={user}
      />
    </div>
  );
}
