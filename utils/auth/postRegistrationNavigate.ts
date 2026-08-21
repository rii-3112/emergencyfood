import { API_ENDPOINTS, APP_ROUTES } from "@/utils/constants";

type NavigateRouter = {
  push: (href: string) => void;
  refresh: () => void;
};

/**
 * メール/Google 共通: 名前・プロフィール登録済みユーザー向けに
 * 招待参加または既定の家族グループ作成へ進む。
 */
export async function navigateAfterRegistrationProfile(
  router: NavigateRouter,
  displayNameTrimmed: string,
  inviteCode: string | null
): Promise<void> {
  try {
    if (inviteCode) {
      const joinResponse = await fetch("/api/team/join-by-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      const joinResult = await joinResponse.json();

      if (joinResponse.ok && joinResult.teamId) {
        router.push(APP_ROUTES.HOME);
      } else {
        throw new Error("招待チームへの参加に失敗しました");
      }
    } else {
      const teamResponse = await fetch(API_ENDPOINTS.CREATE_TEAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: `${displayNameTrimmed}の家族`,
          teamPassword: "",
        }),
      });

      const teamResult = await teamResponse.json();

      if (teamResponse.ok && teamResult.teamId) {
        router.push(APP_ROUTES.HOME);
        router.refresh();
      } else {
        router.push("/settings?tab=team");
      }
    }
  } catch (_error: unknown) {
    console.error("チーム処理エラー:", _error);
    router.push("/settings?tab=team");
  }
}
