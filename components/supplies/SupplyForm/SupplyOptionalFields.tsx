import React from "react";

import { Input } from "@/components/ui";
import type { SupplyFormData } from "@/types/forms";

interface SupplyOptionalFieldsProps {
  formData: SupplyFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export function SupplyOptionalFields({
  formData,
  onChange,
}: SupplyOptionalFieldsProps) {
  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-medium text-gray-900'>追加情報（任意）</h3>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Input
          id='amount'
          label='金額'
          name='amount'
          placeholder='例: 500'
          type='number'
          value={formData.amount || ""}
          onChange={onChange}
        />

        <Input
          id='purchaseLocation'
          label='購入場所'
          name='purchaseLocation'
          placeholder='例: スーパーマーケット'
          type='text'
          value={formData.purchaseLocation || ""}
          onChange={onChange}
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Input
          id='label'
          label='ラベル・メモ'
          name='label'
          placeholder='例: 非常用、日常用'
          type='text'
          value={formData.label || ""}
          onChange={onChange}
        />

        <Input
          id='storageLocation'
          label='保管場所'
          name='storageLocation'
          placeholder='例: キッチン、倉庫'
          type='text'
          value={formData.storageLocation || ""}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
