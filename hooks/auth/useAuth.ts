import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";

import type { AppUser } from "@/types";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/utils/constants";
import { auth } from "@/utils/firebase";

interface UseAuthReturn {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateUserName: (displayName: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

export const useAuth = (requireAuth = false): UseAuthReturn => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName,
            getIdToken: (forceRefresh?: boolean) =>
              firebaseUser.getIdToken(forceRefresh),
            getIdTokenResult: (forceRefresh?: boolean) =>
              firebaseUser.getIdTokenResult(forceRefresh),
          };
          setUser(appUser);
        } else {
          setUser(null);
          if (requireAuth) {
            setError(ERROR_MESSAGES.UNAUTHORIZED);
          }
        }
        setLoading(false);
      },
      (error) => {
        setError(ERROR_MESSAGES.LOGIN_FAILED);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [requireAuth]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      setError("ログアウトに失敗しました");
    }
  };

  const updateUserName = async (displayName: string) => {
    if (!user) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    try {
      await updateProfile(auth.currentUser!, {
        displayName,
      });

      setUser({
        ...user,
        displayName,
      });

      const idToken = await user.getIdToken();
      const response = await fetch(API_ENDPOINTS.UPDATE_USER_NAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || ERROR_MESSAGES.NAME_UPDATE_FAILED);
      }
    } catch (error) {
      throw new Error(ERROR_MESSAGES.NAME_UPDATE_FAILED);
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!user) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || ERROR_MESSAGES.PASSWORD_CHANGE_FAILED);
      }
    } catch (error) {
      throw new Error(ERROR_MESSAGES.PASSWORD_CHANGE_FAILED);
    }
  };

  return {
    user,
    loading,
    error,
    logout,
    updateUserName,
    changePassword,
  };
};
