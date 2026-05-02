import { getServerUser } from "@/utils/auth/server";
import { fetchTeamFromDB } from "@/utils/data/server";
import { adminDb } from "@/utils/firebase/admin";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const baseUser = await getServerUser();

  if (!baseUser) {
    redirect("/auth/login");
  }

  let gender: string | undefined;
  try {
    const userSnap = await adminDb.collection("users").doc(baseUser.uid).get();
    gender = userSnap.data()?.gender as string | undefined;
  } catch {
    /* 性別未取得時は未設定扱い */
  }

  const user = { ...baseUser, gender };

  const team = user.teamId ? await fetchTeamFromDB(user.teamId) : null;

  return (
    <div className='container mx-auto py-8 min-h-screen'>
      <h1 className='text-3xl font-bold mb-6 text-black border-b border-gray-300 pb-4'>
        設定
      </h1>
      <SettingsClient user={user} initialTeam={team} />
    </div>
  );
}
