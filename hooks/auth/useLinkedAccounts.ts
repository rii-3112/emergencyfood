"use client";

import { authClient } from "@/lib/auth-client";
import { useEffect, useMemo, useState } from "react";

const CREDENTIAL_PROVIDER_ID = "credential";
const GOOGLE_PROVIDER_ID = "google";

interface LinkedAccount {
  providerId: string;
}

interface UseLinkedAccountsReturn {
  hasPasswordAccount: boolean;
  hasGoogleAccount: boolean;
  loading: boolean;
}

export const useLinkedAccounts = (): UseLinkedAccountsReturn => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    if (sessionPending) return;

    if (!session?.user) {
      setAccounts(null);
      setAccountsLoading(false);
      return;
    }

    let cancelled = false;
    setAccountsLoading(true);

    void authClient.listAccounts().then(({ data, error }) => {
      if (cancelled) return;
      setAccounts(error ? [] : (data ?? []));
      setAccountsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user, sessionPending]);

  const hasPasswordAccount = useMemo(
    () =>
      accounts?.some(
        (account) => account.providerId === CREDENTIAL_PROVIDER_ID
      ) ?? false,
    [accounts]
  );

  const hasGoogleAccount = useMemo(
    () =>
      accounts?.some((account) => account.providerId === GOOGLE_PROVIDER_ID) ??
      false,
    [accounts]
  );

  return {
    hasPasswordAccount,
    hasGoogleAccount,
    loading: sessionPending || accountsLoading,
  };
};
