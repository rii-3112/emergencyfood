"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks";
import { APP_ROUTES } from "@/utils/constants";

interface HeaderProps {
  onLogoClick: () => void;
  isLoggedIn: boolean;
  teamId?: string | null;
  customNavLinks?: { href: string; label: string }[];
  customTitle?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  isActive: boolean;
}

export default function Header({
  onLogoClick,
  isLoggedIn,
  teamId,
  customNavLinks,
  customTitle,
}: HeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TeamInfo | null>(null);

  const shouldHideNavLinks =
    pathname.startsWith("/auth/") ||
    pathname === "/" ||
    pathname.startsWith("/teams/");

  const shouldShowNavLinks =
    (isLoggedIn && !shouldHideNavLinks && pathname.startsWith("/supplies")) ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/handbook") ||
    pathname.startsWith("/home");

  const getUrlWithTeamId = (basePath: string) => {
    return basePath;
  };

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user || !isLoggedIn) return;

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/team/my-teams", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams || []);
          const active = data.teams?.find((t: TeamInfo) => t.isActive);
          setCurrentTeam(active || null);
        }
      } catch (error) {
        console.error("チーム一覧取得エラー:", error);
      }
    };

    fetchTeams();
  }, [user, isLoggedIn, teamId]);

  const switchTeam = async (newTeamId: string) => {
    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/team/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ teamId: newTeamId }),
      });

      if (response.ok) {
        // トークン更新
        await user.getIdToken(true);
        setIsTeamMenuOpen(false);
        // ページ全体をリロード（状態を完全にリセット）
        window.location.href = APP_ROUTES.HOME;
      }
    } catch (error) {
      console.error("チーム切り替えエラー:", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const defaultNavLinks = [
    { href: getUrlWithTeamId(APP_ROUTES.HOME), label: "ホーム" },
    { href: getUrlWithTeamId("/supplies/list"), label: "備蓄品リスト" },
    { href: getUrlWithTeamId("/supplies/add"), label: "備蓄品登録" },
    { href: getUrlWithTeamId("/supplies/history"), label: "備蓄履歴" },
    { href: getUrlWithTeamId("/handbook"), label: "ハンドブック" },
    { href: getUrlWithTeamId("/settings"), label: "設定" },
  ];

  const navLinks = customNavLinks || defaultNavLinks;
  const title = customTitle || "SonaBase";

  return (
    <header className='bg-white shadow-sm border-b border-gray-300 py-4 z-50 sticky top-0 w-full'>
      <div className='container mx-auto px-4 flex justify-between items-center'>
        <div className='flex items-center space-x-4'>
          <button
            className='text-xl font-bold cursor-pointer text-black hover:text-gray-700 transition-colors'
            onClick={onLogoClick}
          >
            {title}
          </button>

          {shouldShowNavLinks && teams.length > 0 && (
            <div className='relative'>
              <button
                onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
                className='flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors'
              >
                <div className='max-w-[80px] sm:max-w-none truncate'>
                  {currentTeam?.name || "チーム選択"}
                </div>
                <svg
                  className='w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    d='M19 9l-7 7-7-7'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                  />
                </svg>
              </button>

              {isTeamMenuOpen && (
                <div className='absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50'>
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => switchTeam(team.id)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                        team.isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <span>{team.name}</span>
                      {team.isActive && <span className='text-xs'>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {shouldShowNavLinks && (
          <>
            <nav className='hidden md:flex items-center space-x-6'>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  className='text-gray-700 hover:text-black transition-colors font-medium'
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              aria-label='メニューを開く'
              className='md:hidden p-2 rounded-md text-gray-700 hover:text-black hover:bg-gray-100 transition-colors'
              onClick={toggleMenu}
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                {isMenuOpen ? (
                  <path
                    d='M6 18L18 6M6 6l12 12'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                  />
                ) : (
                  <path
                    d='M4 6h16M4 12h16M4 18h16'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                  />
                )}
              </svg>
            </button>
          </>
        )}
      </div>

      {shouldShowNavLinks && isMenuOpen && (
        <div className='md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg'>
          <nav className='container mx-auto px-4 py-4 space-y-2'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                className='block py-3 px-4 text-gray-700 hover:text-black hover:bg-gray-50/80 rounded-lg transition-all duration-200 font-medium'
                href={link.href}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
