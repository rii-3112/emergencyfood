"use client";
import { ErrorMessage } from "@/components/ui";
import { getExpiryType } from "@/utils/stockRecommendations";
import React, { useState } from "react";

interface RestockModalProps {
  supplyName: string;
  unit: string;
  category: string;
  onClose: () => void;
  onConfirm: (
    quantity: number,
    expiryDate: string,
    purchasePrice?: number
  ) => void;
}

export function RestockModal({
  supplyName,
  unit,
  category,
  onClose,
  onConfirm,
}: RestockModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const expiryType = getExpiryType(category);
  const expiryLabel = expiryType.label;
  const isExpiryRequired = expiryType.type !== "noExpiry";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (quantity <= 0) {
      setErrorMessage("数量は1以上を入力してください");
      return;
    }

    if (!expiryDate && isExpiryRequired) {
      setErrorMessage(`${expiryLabel}を入力してください`);
      return;
    }

    const price = purchasePrice ? parseFloat(purchasePrice) : undefined;
    onConfirm(quantity, expiryDate, price);
  };

  return (
    <div className='fixed inset-0 bg-white flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 max-w-md w-full border border-gray-200'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>
          {supplyName}を買い足す
        </h2>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {errorMessage && <ErrorMessage message={errorMessage} />}

          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor='quantity'
            >
              数量 <span className='text-red-500'>*</span>
            </label>
            <div className='flex items-center space-x-2'>
              <input
                required
                className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                id='quantity'
                min={1}
                type='number'
                value={quantity}
                onChange={(e) => {
                  setErrorMessage("");
                  setQuantity(parseInt(e.target.value) || 0);
                }}
              />
              <span className='text-gray-600'>{unit}</span>
            </div>
          </div>

          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor='expiryDate'
            >
              {expiryLabel}{" "}
              {isExpiryRequired && <span className='text-red-500'>*</span>}
            </label>
            <input
              required={isExpiryRequired}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              id='expiryDate'
              min={
                isExpiryRequired
                  ? new Date().toISOString().split("T")[0]
                  : undefined
              }
              type='date'
              value={expiryDate}
              onChange={(e) => {
                setErrorMessage("");
                setExpiryDate(e.target.value);
              }}
            />
          </div>

          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor='purchasePrice'
            >
              購入価格（任意）
            </label>
            <div className='flex items-center space-x-2'>
              <input
                className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                id='purchasePrice'
                min={0}
                placeholder='例: 300'
                type='number'
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
              <span className='text-gray-600'>円</span>
            </div>
          </div>

          <div className='flex space-x-3 mt-6'>
            <button
              className='flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors'
              type='button'
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              className='flex-1 px-4 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500 transition-colors'
              type='submit'
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
