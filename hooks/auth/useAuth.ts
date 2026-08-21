"use client";

import { authClient } from "@/lib/auth-client";
import type { AppUser } from "@/types";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/utils/constants";
import { useMemo } from "react";

interface UseAuthReturn {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateUserName: (displayName: string, gender?: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

export const useAuth = (requireAuth = false): UseAuthReturn => {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();

  const sessionUser = session?.user;
  const user: AppUser | null = useMemo(() => {
    if (!sessionUser) return null;
    return {
      uid: sessionUser.id,
      email: sessionUser.email,
      displayName: sessionUser.name,
      teamId: (sessionUser as { teamId?: string | null }).teamId ?? null,
      lineUserId:
        (sessionUser as { lineUserId?: string | null }).lineUserId ?? null,
    };
  }, [
    sessionUser?.id,
    sessionUser?.email,
    sessionUser?.name,
    (sessionUser as { teamId?: string | null } | undefined)?.teamId,
    (sessionUser as { lineUserId?: string | null } | undefined)?.lineUserId,
  ]);

  const error =
    sessionError?.message ||
    (requireAuth && !isPending && !user ? ERROR_MESSAGES.UNAUTHORIZED : null);

  const logout = async () => {
    await authClient.signOut();
  };

  const updateUserName = async (displayName: string, gender?: string) => {
    if (!user) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const { error: updateError } = await authClient.updateUser({
      name: displayName,
    });
    if (updateError) {
      throw new Error(ERROR_MESSAGES.NAME_UPDATE_FAILED);
    }

    const body: { displayName: string; gender?: string } = { displayName };
    if (gender !== undefined) {
      body.gender = gender;
    }
    const response = await fetch(API_ENDPOINTS.UPDATE_USER_NAME, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || ERROR_MESSAGES.NAME_UPDATE_FAILED);
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!user) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || ERROR_MESSAGES.PASSWORD_CHANGE_FAILED);
    }
  };

  return {
    user,
    loading: isPending,
    error,
    logout,
    updateUserName,
    changePassword,
  };
};
