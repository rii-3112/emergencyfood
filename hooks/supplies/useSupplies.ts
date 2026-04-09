import type { AppUser, Supply } from "@/types";
import { ERROR_MESSAGES } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UseSuppliesReturn {
  supplies: Supply[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  archiveSupply: (supplyId: string) => Promise<void>;
  updateSupply: (supplyId: string) => void;
}

export const useSupplies = (
  user: AppUser | null,
  teamId: string | null,
  isArchived: boolean = false
): UseSuppliesReturn => {
  const router = useRouter();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplies = async () => {
    if (!user?.uid || !teamId) {
      setSupplies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/supplies/list?teamId=${teamId}&isArchived=${isArchived}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "備蓄品リストの取得に失敗しました");
      }

      const result = await response.json();
      setSupplies(result.supplies || []);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(ERROR_MESSAGES.FOOD_FETCH_FAILED);
      } else {
        setError(ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, [user, teamId, isArchived]);

  // アーカイブ機能は履歴機能に統合されました
  // この関数は後方互換性のために残していますが、実際の処理は SupplyItem で行われます
  const archiveSupply = async (supplyIdToArchive: string) => {
    // SupplyItem で直接履歴APIを呼ぶため、ここでは何もしない
    console.warn(
      "archiveSupply is deprecated. Use archive-to-history API directly."
    );
  };

  const updateSupply = (supplyIdToUpdate: string) => {};

  return {
    supplies,
    loading,
    error,
    refetch: fetchSupplies,
    archiveSupply,
    updateSupply,
  };
};
