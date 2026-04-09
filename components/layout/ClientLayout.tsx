"use client";
import Header from "@/components/Header";
import AuthProvider, {
  useAuthContext,
} from "@/components/providers/AuthProvider";
import { ErrorBoundary } from "@/components/ui";
import { usePathname } from "next/navigation";

interface ClientLayoutContentProps {
  children: React.ReactNode;
}

function ClientLayoutContent({ children }: ClientLayoutContentProps) {
  const pathname = usePathname();
  const { user, teamId, handleLogoClick } = useAuthContext();

  return (
    <ErrorBoundary>
      <div className='min-h-screen flex flex-col'>
        {!pathname.startsWith("/event") && (
          <Header
            isLoggedIn={!!user}
            teamId={teamId}
            onLogoClick={handleLogoClick}
          />
        )}
        <main className='flex-1 px-4 sm:px-6 py-4 sm:py-6'>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </AuthProvider>
  );
}
