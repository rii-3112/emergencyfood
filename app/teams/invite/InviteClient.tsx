"use client";
import { useAuth } from "@/hooks";
import { APP_ROUTES, ERROR_MESSAGES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function InviteClient() {
  const { user, loading: authLoading } = useAuth(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");

  const [teamInfo, setTeamInfo] = useState<{
    teamName: string;
    teamId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // errorは、最初エラーなしで、seterrorが出てくることでエラー処理がなされる
  //　loadingが初期状態で、読み込み中が最初に出ることになっている。そのため、後のinvitecodeが取得できたら読み込みを終わらせるようになっている

  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchInviteInfo = async () => {
      if (!inviteCode) {
        setError("招待コードが無効です");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/team/invite-info?code=${inviteCode}`
        );

        if (!response.ok) {
          throw new Error("招待リンクが無効または期限切れです");
        }

        const data = await response.json();
        setTeamInfo({
          teamName: data.teamName,
          teamId: data.teamId,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "招待情報の取得に失敗しました"
        );
        //例外処理
      } finally {
        setLoading(false);
        // finallyは絶対に実行される
      }
    };

    fetchInviteInfo();
    // このuseeffectでinvitecodeが変わったら、fetchInviteInfoが実行される。
  }, [inviteCode]);

  const handleJoinTeam = async () => {
    if (!user) {
      router.push(`/auth/register?invite=${inviteCode}`);
      return;
    }

    if (!teamInfo) return;

    setJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/team/join-by-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "チームへの参加に失敗しました");
      }

      router.push(APP_ROUTES.HOME);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "チームへの参加に失敗しました"
      );
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-600'>{ERROR_MESSAGES.LOADING}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-6'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>エラー</h2>
          <div className='bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-md'>
            {error}
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className='w-full bg-gray-900 text-white py-3 px-6 rounded-md hover:bg-gray-800 transition-colors'
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (!teamInfo) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-600'>招待情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>
          チームへの招待
        </h2>
        <p className='text-gray-600 text-sm'>以下のチームに招待されています</p>
      </div>

      <div className='bg-blue-50 border border-blue-200 rounded-lg p-6 text-center'>
        <div className='text-sm text-gray-600 mb-1'>チーム名</div>
        <div className='text-xl font-bold text-gray-900'>
          {teamInfo.teamName}
        </div>
      </div>

      {!user && (
        <div className='bg-yellow-50 border border-yellow-200 rounded-md p-4'>
          <p className='text-sm text-yellow-800'>
            参加するにはログインまたは新規登録が必要です
          </p>
        </div>
      )}

      <button
        onClick={handleJoinTeam}
        disabled={joining}
        className='w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        {joining
          ? "参加中..."
          : user
            ? "このチームに参加する"
            : "ログイン/登録して参加"}
      </button>

      <button
        onClick={() => router.push("/")}
        className='w-full bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 transition-colors'
      >
        キャンセル
      </button>
    </div>
  );
}
