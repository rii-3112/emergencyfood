// components/supplies/SupplyForm.tsx (Legacy - Replaced by modular version)
// This file is kept for backward compatibility
// New modular version is at ./SupplyForm/index.tsx

"use client";
import { Card, ErrorMessage, SuccessMessage } from "@/components/ui";
import { useSupplyForm } from "@/hooks/forms/useSupplyForm";
import type { SupplyFormProps } from "@/types/forms";

import { SupplyBasicFields } from "./SupplyForm/SupplyBasicFields";
import { SupplyCategoryFields } from "./SupplyForm/SupplyCategoryFields";
import { SupplyFormActions } from "./SupplyForm/SupplyFormActions";
import { SupplyOptionalFields } from "./SupplyForm/SupplyOptionalFields";

export default function SupplyForm({
  uid,
  teamId,
  mode = "add",
  supplyId,
  initialData,
  onCancel,
}: SupplyFormProps) {
  const {
    formData,
    errorMessage,
    successMessage,
    submitting,
    handleChange,
    handleSubmit,
  } = useSupplyForm({
    uid,
    teamId,
    mode,
    supplyId,
    initialData,
  });

  return (
    <div className='max-w-2xl mx-auto'>
      <Card>
        <form onSubmit={handleSubmit}>
          {errorMessage && <ErrorMessage message={errorMessage} />}
          {successMessage && <SuccessMessage message={successMessage} />}

          <div className='space-y-6'>
            <SupplyBasicFields formData={formData} onChange={handleChange} />
            <SupplyCategoryFields formData={formData} onChange={handleChange} />
            <SupplyOptionalFields formData={formData} onChange={handleChange} />
          </div>

          <SupplyFormActions
            mode={mode}
            submitting={submitting}
            onCancel={onCancel}
          />
        </form>
      </Card>
    </div>
  );
}
