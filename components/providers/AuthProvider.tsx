"use client";

import { authClient } from "@/lib/auth-client";
import { APP_ROUTES } from "@/utils/constants";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

interface AuthContextType {
  user: { id: string; email: string; name: string } | null;
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
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user ?? null;
  const teamId = (user as { teamId?: string | null } | null)?.teamId ?? null;

  useEffect(() => {
    if (isPending) return;

    const isAuthPage = pathname.startsWith("/auth/");
    const isHomepage = pathname === "/";
    const isTeamRelatedPage = pathname === "/teams/invite";
    const isAllowedForTeamUsersPage =
      pathname.startsWith("/supplies/") ||
      pathname.startsWith("/handbook") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/home");
    const isSettingsPage = pathname.startsWith("/settings");

    let targetPath: string | null = null;

    if (!user) {
      if (!isAuthPage && !isHomepage) {
        targetPath = "/auth/login";
      }
    } else if (teamId) {
      if (
        !isAllowedForTeamUsersPage &&
        !isAuthPage &&
        !isHomepage &&
        !isTeamRelatedPage
      ) {
        targetPath = APP_ROUTES.HOME;
      }
    } else if (
      !isTeamRelatedPage &&
      !isHomepage &&
      !isSettingsPage &&
      !isAuthPage &&
      !pathname.startsWith("/home") &&
      !pathname.startsWith("/auth/register")
    ) {
      targetPath = "/settings?tab=team";
    }

    if (targetPath && targetPath !== pathname) {
      router.replace(targetPath);
    }
  }, [user, teamId, pathname, router, isPending]);

  const handleLogoClick = useCallback(() => {
    if (!user) {
      router.push("/");
    } else if (teamId) {
      router.push(APP_ROUTES.HOME);
    } else {
      router.push("/settings?tab=team");
    }
  }, [user, teamId, router]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
      teamId,
      handleLogoClick,
    }),
    [user, teamId, handleLogoClick]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
