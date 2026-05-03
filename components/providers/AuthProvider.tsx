"use client";
import {
  refreshAuthToken,
  removeAuthTokenFromCookie,
  saveAuthTokenToCookie,
} from "@/utils/auth/cookies";
import { APP_ROUTES } from "@/utils/constants";
import { auth, onAuthStateChanged } from "@/utils/firebase";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  user: unknown;
  teamId: string | null;
  handleLogoClick: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<unknown>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(0);

  //リダイレクトの処理
  const handleRedirect = useCallback(
    async (currentUser: unknown, currentPath: string) => {
      const isAuthPage = currentPath.startsWith("/auth/");
      const isHomepage = currentPath === "/";
      const isTeamRelatedPage = pathname === "/teams/invite";

      const isAllowedForTeamUsersPage =
        currentPath.startsWith("/supplies/") ||
        currentPath.startsWith("/handbook") ||
        currentPath.startsWith("/settings") ||
        currentPath.startsWith("/home");

      const isSettingsPage = currentPath.startsWith("/settings");
      let targetPath: string | null = null;

      if (!currentUser) {
        setTeamId(null);
        if (!isAuthPage && !isHomepage) {
          targetPath = "/auth/login";
        } else {
          targetPath = currentPath;
        }
      } else {
        let userTeamId: string | null = null;

        try {
          if (
            currentUser &&
            typeof currentUser === "object" &&
            "getIdTokenResult" in currentUser &&
            typeof (currentUser as { getIdTokenResult: unknown })
              .getIdTokenResult === "function"
          ) {
            const now = Date.now();
            const shouldRefresh = now - lastTokenRefresh > 50 * 60 * 1000;

            const idTokenResult = await (
              currentUser as {
                getIdTokenResult: (forceRefresh?: boolean) => Promise<{
                  claims: { teamId?: string };
                }>;
              }
            ).getIdTokenResult(shouldRefresh);

            if (shouldRefresh) {
              setLastTokenRefresh(now);
            }

            userTeamId = (idTokenResult.claims.teamId as string | null) || null;
          }
        } catch (_error) {
          userTeamId = null;
        }

        setTeamId(userTeamId);

        if (userTeamId) {
          if (!isAllowedForTeamUsersPage && !isAuthPage && !isHomepage) {
            targetPath = "/";
          } else {
            targetPath = currentPath;
          }
        } else {
          if (
            !isTeamRelatedPage &&
            !isHomepage &&
            !isSettingsPage &&
            !isAuthPage &&
            !currentPath.startsWith("/home")
          ) {
            targetPath = "/";
          } else {
            targetPath = currentPath;
          }
        }
      }

      if (targetPath && targetPath !== currentPath) {
        router.replace(targetPath);
      }
    },
    [router, pathname, lastTokenRefresh]
  );

  //ログイン時の処理
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        saveAuthTokenToCookie(currentUser);
      } else {
        removeAuthTokenFromCookie();
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await handleRedirect(currentUser, pathname);
        } catch (error) {
          console.error("Redirect error:", error);
        }
      }, 100);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribeAuth();
    };
  }, [pathname, router, handleRedirect]);
  //トークン
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(
      async () => {
        try {
          if (
            user &&
            typeof user === "object" &&
            "getIdTokenResult" in user &&
            typeof (user as { getIdTokenResult: unknown }).getIdTokenResult ===
              "function"
          ) {
            const idTokenResult = await (
              user as {
                getIdTokenResult: (forceRefresh?: boolean) => Promise<{
                  claims: { teamId?: string };
                }>;
              }
            ).getIdTokenResult(true);

            const newTeamId =
              (idTokenResult.claims.teamId as string | null) || null;
            setTeamId(newTeamId);
            setLastTokenRefresh(Date.now());

            refreshAuthToken(user as any);
          }
        } catch (error) {
          console.error("Token auto-refresh error:", error);
        }
      },
      50 * 60 * 1000
    );

    return () => clearInterval(refreshInterval);
  }, [user]);

  // ロゴクリックの処理
  const handleLogoClick = useCallback(() => {
    if (!user) {
      router.push("/");
    } else if (teamId !== null) {
      router.push(APP_ROUTES.HOME);
    } else {
      router.push("/settings?tab=team");
    }
  }, [user, teamId, router]);

  const contextValue: AuthContextType = {
    user,
    teamId,
    handleLogoClick,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
