"use client";
import SupplyForm from "@/components/supplies/SupplyForm";
import type { SupplyFormData } from "@/types/forms";
import { ERROR_MESSAGES, FOOD_CATEGORIES } from "@/utils/constants";
import { getRecommendation } from "@/utils/stockRecommendations";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
}

interface SupplyAddFormProps {
  user: ServerUser;
}

export default function SupplyAddForm({ user }: SupplyAddFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromQuery = searchParams.get("category");

  const initialData = useMemo((): Partial<SupplyFormData> | undefined => {
    if (
      !categoryFromQuery ||
      !(FOOD_CATEGORIES as readonly string[]).includes(categoryFromQuery)
    ) {
      return undefined;
    }
    const rec = getRecommendation(categoryFromQuery);
    return {
      category: categoryFromQuery,
      ...(rec?.unit ? { unit: rec.unit } : {}),
    };
  }, [categoryFromQuery]);

  return (
    <SupplyForm
      teamId={user.teamId!}
      uid={user.uid}
      initialData={initialData}
      onCancel={() => router.push("/supplies/list")}
    />
  );
}

export function SupplyAddFormFallback() {
  return (
    <div className='flex justify-center py-12'>
      <p className='text-gray-600'>{ERROR_MESSAGES.LOADING}</p>
    </div>
  );
}
