import React from "react";

import { Input, Select } from "@/components/ui";
import type { SupplyFormData } from "@/types/forms";
import { FOOD_UNITS } from "@/utils/constants";
import { getExpiryType } from "@/utils/stockRecommendations";

interface SupplyBasicFieldsProps {
  formData: SupplyFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export function SupplyBasicFields({
  formData,
  onChange,
}: SupplyBasicFieldsProps) {
  const unitOptions = FOOD_UNITS.map((unit) => ({
    value: unit,
    label: unit,
  }));

  const expiryType = getExpiryType(formData.category);
  const expiryLabel = expiryType.label;
  const isExpiryRequired = expiryType.type !== "noExpiry";

  return (
    <div className='space-y-4'>
      <Input
        required
        id='name'
        label='品名'
        name='name'
        type='text'
        value={formData.name}
        onChange={onChange}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Input
          required
          id='quantity'
          label='数量'
          min={1}
          name='quantity'
          type='number'
          value={formData.quantity}
          onChange={onChange}
        />

        <Select
          required
          id='unit'
          label='単位'
          name='unit'
          options={unitOptions}
          placeholder='選択してください'
          value={formData.unit}
          onChange={onChange}
        />
      </div>

      <Input
        required={isExpiryRequired}
        id='expiryDate'
        label={expiryLabel}
        min={
          isExpiryRequired ? new Date().toISOString().split("T")[0] : undefined
        }
        name='expiryDate'
        type='date'
        value={formData.expiryDate}
        onChange={onChange}
      />
    </div>
  );
}
