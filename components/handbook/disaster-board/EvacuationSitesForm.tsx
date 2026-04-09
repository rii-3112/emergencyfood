"use client";
import { Button, Card, Input, Select } from "@/components/ui";
import type { DisasterType, EvacuationSite } from "@/types/forms";
import { useState } from "react";

interface EvacuationSitesFormProps {
  sites: EvacuationSite[];
  onUpdate: (sites: EvacuationSite[]) => void;
}

const DISASTER_TYPES: { value: DisasterType; label: string }[] = [
  { value: "earthquake", label: "地震" },
  { value: "tsunami", label: "津波" },
  { value: "flood", label: "大雨・洪水" },
  { value: "typhoon", label: "台風" },
];

const INITIAL_SITE: Omit<EvacuationSite, "id"> = {
  disasterType: "earthquake",
  name: "",
  address: "",
  notes: "",
};

export function EvacuationSitesForm({
  sites,
  onUpdate,
}: EvacuationSitesFormProps) {
  const [newSite, setNewSite] =
    useState<Omit<EvacuationSite, "id">>(INITIAL_SITE);
  const [isAdding, setIsAdding] = useState(false);

  const resetForm = () => {
    setNewSite(INITIAL_SITE);
  };

  const handleAddSite = () => {
    if (!newSite.name.trim() || !newSite.address.trim()) return;

    const site: EvacuationSite = {
      id: Date.now().toString(),
      ...newSite,
    };

    onUpdate([...sites, site]);
    resetForm();
    setIsAdding(false);
  };

  const handleRemoveSite = (id: string) => {
    onUpdate(sites.filter((site) => site.id !== id));
  };

  const _handleUpdateSite = (
    id: string,
    updatedSite: Partial<EvacuationSite>
  ) => {
    onUpdate(
      sites.map((site) => (site.id === id ? { ...site, ...updatedSite } : site))
    );
  };

  return (
    <Card>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>避難場所</h2>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          追加
        </Button>
      </div>

      <div className='space-y-4'>
        {sites.map((site) => (
          <div key={site.id} className='border border-gray-200 rounded-lg p-4'>
            <div className='flex justify-between items-start mb-2'>
              <div className='flex items-center gap-2'>
                <span className='font-medium text-gray-900'>{site.name}</span>
                <span className='text-sm text-gray-500'>
                  (
                  {
                    DISASTER_TYPES.find((t) => t.value === site.disasterType)
                      ?.label
                  }
                  )
                </span>
              </div>
              <Button
                variant='danger'
                size='sm'
                onClick={() => handleRemoveSite(site.id!)}
              >
                削除
              </Button>
            </div>
            <p className='text-sm text-gray-600 mb-1'>
              <strong>住所:</strong> {site.address}
            </p>
            {site.notes && (
              <p className='text-sm text-gray-600'>
                <strong>備考:</strong> {site.notes}
              </p>
            )}
          </div>
        ))}

        {sites.length === 0 && !isAdding && (
          <div className='text-center py-8 text-gray-500'>
            <p>避難場所が登録されていません</p>
            <p className='text-sm'>「追加」から登録してください</p>
          </div>
        )}

        {isAdding && (
          <div className='border-2 border-solid border-gray-300 rounded-lg p-4 bg-gray-50'>
            <h3 className='font-bold text-gray-900 mb-4'>避難場所を追加</h3>
            <div className='space-y-4'>
              <Select
                label='どんな災害のときか'
                required
                value={newSite.disasterType}
                onChange={(e) =>
                  setNewSite((prev) => ({
                    ...prev,
                    disasterType: e.target.value as DisasterType,
                  }))
                }
                options={DISASTER_TYPES}
              />

              <Input
                label='避難場所名'
                required
                value={newSite.name}
                onChange={(e) =>
                  setNewSite((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder='例: 〇〇小学校体育館'
              />

              <Input
                label='住所・場所'
                required
                value={newSite.address}
                onChange={(e) =>
                  setNewSite((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder='例: 〇〇市〇〇1-2-3'
              />

              <Input
                label='備考・メモ'
                value={newSite.notes || ""}
                onChange={(e) =>
                  setNewSite((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder='例: 3階建て'
              />

              <div className='flex gap-2'>
                <Button
                  onClick={handleAddSite}
                  disabled={!newSite.name.trim() || !newSite.address.trim()}
                >
                  追加
                </Button>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
