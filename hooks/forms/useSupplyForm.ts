import { useAuth } from "@/hooks/auth/useAuth";
import type { FormMode, SupplyFormData } from "@/types/forms";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UseSupplyFormProps {
  uid: string | null;
  teamId: string | null;
  mode?: FormMode;
  supplyId?: string;
  initialData?: Partial<SupplyFormData>;
}

function mergeDefinedPreset(
  base: SupplyFormData,
  preset?: Partial<SupplyFormData>
): SupplyFormData {
  if (!preset) return base;
  const next = { ...base };
  (Object.keys(preset) as (keyof SupplyFormData)[]).forEach((key) => {
    const value = preset[key];
    if (value === undefined || value === null) return;
    if (value === "") return;
    (next as Record<string, unknown>)[key as string] = value;
  });
  return next;
}

interface UseSupplyFormReturn {
  formData: SupplyFormData;
  errorMessage: string | null;
  successMessage: string | null;
  submitting: boolean;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  setFormData: React.Dispatch<React.SetStateAction<SupplyFormData>>;
}

const initialFormState: SupplyFormData = {
  name: "",
  quantity: 1,
  expiryDate: "",
  category: "",
  unit: "",
  amount: undefined,
  purchaseLocation: undefined,
  label: undefined,
  storageLocation: undefined,
};

export function useSupplyForm({
  uid,
  teamId,
  mode = "add",
  supplyId,
  initialData,
}: UseSupplyFormProps): UseSupplyFormReturn {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState<SupplyFormData>(() =>
    mergeDefinedPreset(initialFormState, initialData)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 初期データ（編集／URL プリセットなど）
  useEffect(() => {
    if (!initialData) return;

    if (mode === "edit") {
      setFormData(mergeDefinedPreset(initialFormState, initialData));
      return;
    }

    if (mode === "add") {
      setFormData((prev) => mergeDefinedPreset(prev, initialData));
    }
  }, [mode, initialData]);

  const resetForm = () => {
    setFormData(initialFormState);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: SupplyFormData) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const { name, quantity, expiryDate, category, unit } = formData;

    if (!name || !quantity || !expiryDate || !category || !unit) {
      setErrorMessage("必須フィールドをすべて入力してください。");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      // Validation
      if (!uid) {
        setErrorMessage(ERROR_MESSAGES.UNAUTHORIZED);
        return;
      }
      if (!teamId) {
        setErrorMessage(ERROR_MESSAGES.FAMILY_GROUP_ID_MISSING);
        return;
      }
      if (!validateForm()) {
        return;
      }

      const {
        name,
        quantity,
        expiryDate,
        category,
        unit,
        amount,
        purchaseLocation,
        label,
        storageLocation,
      } = formData;

      if (mode === "add") {
        if (!user) {
          setErrorMessage(ERROR_MESSAGES.UNAUTHORIZED);
          return;
        }

        const response = await fetch("/api/supplies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            quantity: Number(quantity),
            expiryDate,
            category,
            unit,
            amount: amount !== undefined ? Number(amount) : null,
            purchaseLocation: purchaseLocation || null,
            label: label || null,
            storageLocation: storageLocation || "未設定",
            teamId,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "備蓄品の追加に失敗しました");
        }

        resetForm();
        setSuccessMessage(SUCCESS_MESSAGES.FOOD_CREATED);

        setTimeout(() => {
          router.push("/supplies/list");
        }, 1500);
      } else {
        if (!supplyId) {
          setErrorMessage("備蓄品IDが見つかりません。");
          return;
        }

        const updates = {
          name,
          quantity: Number(quantity),
          expiryDate,
          category,
          unit,
          amount: amount !== undefined ? Number(amount) : null,
          purchaseLocation: purchaseLocation || null,
          label: label || null,
          storageLocation: storageLocation || "未設定",
        };

        if (!user) {
          setErrorMessage(ERROR_MESSAGES.UNAUTHORIZED);
          return;
        }

        const response = await fetch("/api/actions/update-supply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplyId,
            updates,
          }),
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API Error:", errorData);
          throw new Error(errorData.error || "更新に失敗しました");
        }

        setSuccessMessage("備蓄品情報が正常に更新されました！");

        setTimeout(() => {
          router.push("/supplies/list");
        }, 1500);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(
          mode === "add"
            ? ERROR_MESSAGES.FOOD_CREATE_FAILED
            : "備蓄品情報の更新に失敗しました。"
        );
      } else {
        setErrorMessage("不明なエラーが発生しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    errorMessage,
    successMessage,
    submitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData,
  };
}
