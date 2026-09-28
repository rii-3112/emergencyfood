import type { AppUser, Team, TeamMember } from "@/types";
import { authClient } from "@/lib/auth-client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/utils/constants";
import { useEffect, useState } from "react";

interface UseTeamReturn {
  teamId: string | null;
  currentTeamId: string | null;
  team: Team | null;
  teamMembers: TeamMember[];
  loading: boolean;
  error: string | null;
  createTeam: (
    teamName: string,
    teamPassword: string
  ) => Promise<{ teamId?: string; message: string }>;
  joinTeam: (
    teamName: string,
    teamPassword: string
  ) => Promise<{ teamId?: string; message: string }>;
  addAdmin: (userId: string) => Promise<void>;
  removeAdmin: (userId: string) => Promise<void>;
  refreshTeam: () => Promise<void>;
}

export const useTeam = (user: AppUser | null): UseTeamReturn => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTeamId(null);
      setCurrentTeamId(null);
      setLoading(false);
      return;
    }

    const nextTeamId = user.teamId ?? null;
    setTeamId(nextTeamId);
    setCurrentTeamId(nextTeamId);
    setLoading(false);
  }, [user]);

  const fetchTeamInfo = async () => {
    if (!currentTeamId || !user) return;

    try {
      const response = await fetch(`/api/team/${currentTeamId}`);

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.FAMILY_GROUP_FETCH_FAILED);
      }

      const teamData = await response.json();
      setTeam(teamData.team);
      setTeamMembers(teamData.members);
    } catch (_e) {
      setError(ERROR_MESSAGES.FAMILY_GROUP_FETCH_FAILED);
    }
  };

  useEffect(() => {
    if (currentTeamId) {
      fetchTeamInfo();
    }
  }, [currentTeamId]);

  const createTeam = async (teamName: string, teamPassword: string) => {
    if (!user) {
      throw new Error("ユーザーが認証されていません");
    }

    const response = await fetch(API_ENDPOINTS.CREATE_TEAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teamName,
        teamPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "チームの作成に失敗しました。");
    }

    if (result.teamId) {
      await authClient.getSession();
      setTeamId(result.teamId);
      setCurrentTeamId(result.teamId);
    }

    return result;
  };

  const joinTeam = async (teamName: string, teamPassword: string) => {
    if (!user) {
      throw new Error("ユーザーが認証されていません");
    }

    const response = await fetch(API_ENDPOINTS.JOIN_TEAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teamName,
        teamPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "チームへの参加に失敗しました。");
    }

    if (result.teamId) {
      await authClient.getSession();
      setTeamId(result.teamId);
      setCurrentTeamId(result.teamId);
    }

    return result;
  };

  const addAdmin = async (userId: string) => {
    if (!currentTeamId || !user) {
      throw new Error("チームIDまたはユーザーが設定されていません");
    }

    const response = await fetch(API_ENDPOINTS.ADD_ADMIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teamId: currentTeamId,
        userId,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || ERROR_MESSAGES.ADMIN_UPDATE_FAILED);
    }

    await fetchTeamInfo();
  };

  const removeAdmin = async (userId: string) => {
    if (!currentTeamId || !user) {
      throw new Error("チームIDまたはユーザーが設定されていません");
    }

    const response = await fetch(API_ENDPOINTS.REMOVE_ADMIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teamId: currentTeamId,
        userId,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || ERROR_MESSAGES.ADMIN_UPDATE_FAILED);
    }

    await fetchTeamInfo();
  };

  const refreshTeam = async () => {
    await fetchTeamInfo();
  };

  return {
    teamId,
    currentTeamId,
    team,
    teamMembers,
    loading,
    error,
    createTeam,
    joinTeam,
    addAdmin,
    removeAdmin,
    refreshTeam,
  };
};
