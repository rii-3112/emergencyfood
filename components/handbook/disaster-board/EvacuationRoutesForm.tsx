"use client";
import { Button, Card, Input } from "@/components/ui";
import type { EvacuationRoute } from "@/types/forms";
import { useState } from "react";

interface EvacuationRoutesFormProps {
  routes: EvacuationRoute[];
  onUpdate: (routes: EvacuationRoute[]) => void;
}

const INITIAL_ROUTE: Omit<EvacuationRoute, "id"> = {
  name: "",
  description: "",
  landmarks: "",
  notes: "",
};

export function EvacuationRoutesForm({
  routes,
  onUpdate,
}: EvacuationRoutesFormProps) {
  const [newRoute, setNewRoute] =
    useState<Omit<EvacuationRoute, "id">>(INITIAL_ROUTE);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRoute = () => {
    if (!newRoute.name.trim() || !newRoute.description.trim()) return;

    const route: EvacuationRoute = {
      id: Date.now().toString(),
      ...newRoute,
    };

    onUpdate([...routes, route]);
    setNewRoute(INITIAL_ROUTE);
    setIsAdding(false);
  };

  const handleRemoveRoute = (id: string) => {
    onUpdate(routes.filter((route) => route.id !== id));
  };

  return (
    <Card>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>避難経路</h2>
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
        {routes.map((route) => (
          <div key={route.id} className='border border-gray-200 rounded-lg p-4'>
            <div className='flex justify-between items-start mb-2'>
              <h3 className='font-medium text-gray-900'>{route.name}</h3>
              <Button
                variant='danger'
                size='sm'
                onClick={() => handleRemoveRoute(route.id!)}
              >
                削除
              </Button>
            </div>
            <p className='text-sm text-gray-600 mb-2'>
              <strong>経路:</strong> {route.description}
            </p>
            {route.landmarks && (
              <p className='text-sm text-gray-600 mb-2'>
                <strong>目印:</strong> {route.landmarks}
              </p>
            )}
            {route.notes && (
              <p className='text-sm text-gray-600'>
                <strong>備考:</strong> {route.notes}
              </p>
            )}
          </div>
        ))}

        {routes.length === 0 && !isAdding && (
          <div className='text-center py-8 text-gray-500'>
            <p>避難経路が登録されていません</p>
            <p className='text-sm'>「追加」から登録してください</p>
          </div>
        )}

        {isAdding && (
          <div className='border-2 border-solid border-gray-300 rounded-lg p-4 bg-gray-50'>
            <h3 className='font-bold text-gray-900 mb-4'>避難経路を追加</h3>
            <div className='space-y-4'>
              <Input
                label='経路の名前'
                required
                value={newRoute.name}
                onChange={(e) =>
                  setNewRoute((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder='例: メインルート, 迂回ルート'
              />

              <Input
                label='経路の説明'
                required
                value={newRoute.description}
                onChange={(e) =>
                  setNewRoute((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='例: 自宅→〇〇通り→△△公園→避難所'
              />

              <Input
                label='目印・ランドマーク'
                value={newRoute.landmarks || ""}
                onChange={(e) =>
                  setNewRoute((prev) => ({
                    ...prev,
                    landmarks: e.target.value,
                  }))
                }
                placeholder='例: コンビニ、信号機、橋など'
              />

              <Input
                label='備考・注意事項'
                value={newRoute.notes || ""}
                onChange={(e) =>
                  setNewRoute((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder='例: 夜間は街灯が少ない、雨天時は滑りやすい'
              />

              <div className='flex gap-2'>
                <Button
                  onClick={handleAddRoute}
                  disabled={
                    !newRoute.name.trim() || !newRoute.description.trim()
                  }
                >
                  追加
                </Button>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setIsAdding(false);
                    setNewRoute(INITIAL_ROUTE);
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
