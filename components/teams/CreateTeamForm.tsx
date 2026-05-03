// components/teams/CreateTeamForm.tsx
"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { useAuth, useTeam } from "@/hooks";
import { APP_ROUTES, ERROR_MESSAGES } from "@/utils/constants";

interface CreateTeamFormProps {
  onClose?: () => void;
}

export default function CreateTeamForm({ onClose }: CreateTeamFormProps) {
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { createTeam } = useTeam(user);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!user) {
      setError(ERROR_MESSAGES.UNAUTHORIZED);
      setLoading(false);
      return;
    }

    try {
      const result = await createTeam(teamName, "");
      setSuccessMessage(
        result.message || `家族グループ "${teamName}" を作成し、参加しました！`
      );

      if (result.teamId) {
        if (onClose) {
          router.push(`/settings?tab=team&teamId=${result.teamId}`);
          router.refresh();
          setTimeout(() => {
            onClose();
          }, 500);
        } else {
          router.push(`${APP_ROUTES.HOME}?teamId=${result.teamId}`);
          router.refresh();
        }
      } else {
        router.replace(APP_ROUTES.HOME);
      }
    } catch (_error: unknown) {
      let msg: string = ERROR_MESSAGES.UNKNOWN_ERROR;
      if (_error instanceof Error) msg = _error.message;
      setError(`チームの作成に失敗しました: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className='space-y-4 sm:space-y-6 max-w-md mx-auto w-full px-4 sm:px-0'
      onSubmit={handleCreateTeam}
    >
      <h1 className='text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-black text-center'>
        新しい家族グループを作る
      </h1>
      {error && (
        <div className='bg-red-200 border text-black px-3 sm:px-4 py-3 relative mb-4 rounded-md text-sm'>
          {error}
        </div>
      )}
      {successMessage && (
        <div className='bg-green-200 border text-black px-3 sm:px-4 py-3 relative mb-4 rounded-md text-sm'>
          {successMessage}
        </div>
      )}
      <div className='space-y-3 sm:space-y-4'>
        <div>
          <label
            className='block text-black text-sm font-medium mb-1 sm:mb-2'
            htmlFor='teamName'
          >
            家族グループ名
          </label>
          <input
            required
            className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 text-base'
            disabled={loading}
            id='teamName'
            placeholder='家族グループ名を決めてください'
            type='text'
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <p className='text-xs text-gray-600 mt-1'>
            家族を招待するには、作成後に招待リンクを生成してください
          </p>
        </div>
      </div>
      <button
        className='w-full bg-black text-white font-semibold py-3 px-6 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 text-base'
        type='submit'
      >
        {loading ? "作成中..." : "作成"}
      </button>
    </form>
  );
}
