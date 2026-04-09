"use client";
import { Button, Card, Input, Select } from "@/components/ui";
import type { FamilyAgreement } from "@/types/forms";
import { useState } from "react";

interface FamilyAgreementsFormProps {
  agreements: FamilyAgreement[];
  onUpdate: (agreements: FamilyAgreement[]) => void;
}

const AGREEMENT_CATEGORIES = [
  { value: "集合場所", label: "集合場所・待ち合わせ" },
  { value: "連絡方法", label: "連絡方法・タイミング" },
  { value: "役割分担", label: "役割分担・責任" },
  { value: "避難判断", label: "避難の判断基準" },
  { value: "ペット", label: "ペットについて" },
  { value: "貴重品", label: "貴重品・重要書類" },
  { value: "その他", label: "その他の約束事" },
];

export function FamilyAgreementsForm({
  agreements,
  onUpdate,
}: FamilyAgreementsFormProps) {
  const [newAgreement, setNewAgreement] = useState<Omit<FamilyAgreement, "id">>(
    {
      title: "",
      description: "",
      category: "集合場所",
    }
  );
  const [isAdding, setIsAdding] = useState(false);

  const handleAddAgreement = () => {
    if (!newAgreement.title.trim() || !newAgreement.description.trim()) return;

    const agreement: FamilyAgreement = {
      id: Date.now().toString(),
      ...newAgreement,
    };

    onUpdate([...agreements, agreement]);
    setNewAgreement({
      title: "",
      description: "",
      category: "集合場所",
    });
    setIsAdding(false);
  };

  const handleRemoveAgreement = (id: string) => {
    onUpdate(agreements.filter((agreement) => agreement.id !== id));
  };

  const groupedAgreements = agreements.reduce(
    (acc, agreement) => {
      if (!acc[agreement.category]) {
        acc[agreement.category] = [];
      }
      acc[agreement.category].push(agreement);
      return acc;
    },
    {} as Record<string, FamilyAgreement[]>
  );

  const getCategoryIcon = (category: string) => {
    return (
      AGREEMENT_CATEGORIES.find((cat) => cat.value === category)?.label || ""
    );
  };

  return (
    <Card>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>家族の約束事</h2>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          追加
        </Button>
      </div>

      <div className='space-y-6'>
        {Object.keys(groupedAgreements).length > 0 ? (
          <div className='space-y-4'>
            {Object.entries(groupedAgreements).map(
              ([category, categoryAgreements]) => (
                <div
                  key={category}
                  className='border border-gray-200 rounded-lg p-4'
                >
                  <h3 className='font-medium text-gray-800 mb-3'>
                    {getCategoryIcon(category)}
                    {AGREEMENT_CATEGORIES.find((cat) => cat.value === category)
                      ?.label || category}
                  </h3>
                  <div className='space-y-3'>
                    {categoryAgreements.map((agreement) => (
                      <div
                        key={agreement.id}
                        className='bg-gray-50 rounded-lg p-3'
                      >
                        <div className='flex justify-between items-start mb-2'>
                          <h4 className='font-medium text-gray-900'>
                            {agreement.title}
                          </h4>
                          <Button
                            variant='danger'
                            size='sm'
                            onClick={() => handleRemoveAgreement(agreement.id!)}
                          >
                            削除
                          </Button>
                        </div>
                        <p className='text-sm text-gray-600'>
                          {agreement.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          !isAdding && (
            <div className='text-center py-8 text-gray-500'>
              <p>家族の約束事はありません</p>
              <p className='text-sm'>「追加」ボタンから登録しよう！</p>
            </div>
          )
        )}

        {isAdding && (
          <div className='border-2 border-solid border-gray-300 rounded-lg p-4 bg-gray-50'>
            <h3 className='font-bold text-gray-900 mb-4'>約束事を追加</h3>
            <div className='space-y-4'>
              <Select
                label='カテゴリ'
                required
                value={newAgreement.category}
                onChange={(e) =>
                  setNewAgreement((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                options={AGREEMENT_CATEGORIES}
              />

              <Input
                label='約束事のタイトル'
                required
                value={newAgreement.title}
                onChange={(e) =>
                  setNewAgreement((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder='例:〇〇にいるとき'
              />

              <div className='space-y-1'>
                <label className='block text-sm font-medium text-gray-700'>
                  詳細・内容 <span className='text-red-500'>*</span>
                </label>
                <textarea
                  required
                  value={newAgreement.description}
                  onChange={(e) =>
                    setNewAgreement((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder='例: 地震発生後、安全を確認してから〇〇公園の時計台前に集合する。'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent'
                  rows={3}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={handleAddAgreement}
                  disabled={
                    !newAgreement.title.trim() ||
                    !newAgreement.description.trim()
                  }
                >
                  追加
                </Button>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setIsAdding(false);
                    setNewAgreement({
                      title: "",
                      description: "",
                      category: "集合場所",
                    });
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        )}

        {agreements.length === 0 && (
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <h3 className='font-medium text-gray-800 mb-2'>約束事の例</h3>
            <ul className='text-sm text-gray-700 space-y-1'>
              <li>
                •
                震度5以上の地震が発生したら、まず身の安全を確保してから〇〇公園に集合！！
              </li>
              <li>
                •
                連絡が取れない場合は、毎日18時に災害用伝言ダイヤル（171）で安否報告する
              </li>
              <li>• 避難時は長男が貴重品、長女がペットの世話をお願いね！</li>
              <li>• 津波警報が出たら、迷わず高台の△△神社へ避難する</li>
              <li>• 家族が帰宅困難になった場合の対応方法</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
