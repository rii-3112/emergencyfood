import { getServerUser } from "@/utils/auth/server";
import {
  fetchDisasterBoardFromDB,
  fetchSuppliesFromDB,
  fetchTeamFromDB,
} from "@/utils/data/server";
import { summarizePlans, summarizeSupplies } from "@/utils/homeOverview";
import { redirect } from "next/navigation";
import FamilyDisasterOverview from "./_components/FamilyDisasterOverview";

export const dynamic = "force-dynamic";

export default async function HomeHubPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!user.teamId) {
    redirect("/settings?tab=team");
  }

  const [supplies, team, plans] = await Promise.all([
    fetchSuppliesFromDB(user.teamId, false),
    fetchTeamFromDB(user.teamId),
    fetchDisasterBoardFromDB(user.teamId),
  ]);

  return (
    <FamilyDisasterOverview
      plans={summarizePlans(plans)}
      supplies={summarizeSupplies(supplies, team?.stockSettings, user.gender)}
      teamName={team?.name || "家族"}
    />
  );
}
