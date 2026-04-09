"use client";
import { Button, Card, Input } from "@/components/ui";
import type { SafetyConfirmationMethod } from "@/types/forms";
import { useState } from "react";

interface SafetyMethodsFormProps {
  methods: SafetyConfirmationMethod[];
  onUpdate: (methods: SafetyConfirmationMethod[]) => void;
}

export function SafetyMethodsForm({
  methods,
  onUpdate,
}: SafetyMethodsFormProps) {
  const [newMethod, setNewMethod] = useState<
    Omit<SafetyConfirmationMethod, "id">
  >({
    method: "",
    contact: "",
    priority: methods.length + 1,
    notes: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddMethod = () => {
    if (!newMethod.method.trim() || !newMethod.contact.trim()) return;

    const method: SafetyConfirmationMethod = {
      id: Date.now().toString(),
      ...newMethod,
    };

    onUpdate([...methods, method]);
    setNewMethod({
      method: "",
      contact: "",
      priority: methods.length + 2,
      notes: "",
    });
    setIsAdding(false);
  };

  const handleRemoveMethod = (id: string) => {
    const updatedMethods = methods.filter((method) => method.id !== id);
    const reorderedMethods = updatedMethods.map((method, index) => ({
      ...method,
      priority: index + 1,
    }));
    onUpdate(reorderedMethods);
  };

  const handleMovePriority = (id: string, direction: "up" | "down") => {
    const currentIndex = methods.findIndex((method) => method.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === methods.length - 1)
    ) {
      return;
    }

    const newMethods = [...methods];
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    [newMethods[currentIndex], newMethods[targetIndex]] = [
      newMethods[targetIndex],
      newMethods[currentIndex],
    ];

    const reorderedMethods = newMethods.map((method, index) => ({
      ...method,
      priority: index + 1,
    }));

    onUpdate(reorderedMethods);
  };

  const sortedMethods = [...methods].sort((a, b) => a.priority - b.priority);

  return (
    <Card>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>安否確認手段</h2>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          追加
        </Button>
      </div>

      <div className='space-y-3'>
        {sortedMethods.map((method, index) => (
          <div
            key={method.id}
            className='border border-gray-200 rounded-lg p-4'
          >
            <div className='flex justify-between items-start'>
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded'>
                    優先度 {method.priority}
                  </span>
                  <span className='text-lg'>{method.method}</span>
                  <span className='font-medium text-gray-900'>
                    {method.method}
                  </span>
                </div>
                <p className='text-sm text-gray-600 mb-1'>
                  <strong>連絡先:</strong> {method.contact}
                </p>
                {method.notes && (
                  <p className='text-sm text-gray-600'>
                    <strong>備考:</strong> {method.notes}
                  </p>
                )}
              </div>

              <div className='flex gap-1 ml-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleMovePriority(method.id!, "up")}
                  disabled={index === 0}
                  className='px-2'
                >
                  ↑
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleMovePriority(method.id!, "down")}
                  disabled={index === sortedMethods.length - 1}
                  className='px-2'
                >
                  ↓
                </Button>
                <Button
                  variant='danger'
                  size='sm'
                  onClick={() => handleRemoveMethod(method.id!)}
                >
                  削除
                </Button>
              </div>
            </div>
          </div>
        ))}

        {methods.length === 0 && !isAdding && (
          <div className='text-center py-8 text-gray-500'>
            <p>安否確認手段が登録されていません</p>
            <p className='text-sm'>「追加」から登録してください</p>
          </div>
        )}

        {isAdding && (
          <div className='border-2 border-solid border-gray-300 rounded-lg p-4 bg-gray-50'>
            <div className='space-y-4'>
              <Input
                label='確認方法'
                required
                value={newMethod.method}
                onChange={(e) =>
                  setNewMethod((prev) => ({ ...prev, method: e.target.value }))
                }
                placeholder='例: 災害用伝言ダイヤル, LINE, メール'
              />

              <Input
                label='連絡先・詳細'
                required
                value={newMethod.contact}
                onChange={(e) =>
                  setNewMethod((prev) => ({ ...prev, contact: e.target.value }))
                }
                placeholder='例: 171, family-group, xxx@example.com'
              />

              <Input
                label='備考・使い方'
                value={newMethod.notes || ""}
                onChange={(e) =>
                  setNewMethod((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder='例: 毎日18時に確認、家族全員で共有'
              />

              <div className='flex gap-2'>
                <Button
                  onClick={handleAddMethod}
                  disabled={
                    !newMethod.method.trim() || !newMethod.contact.trim()
                  }
                >
                  追加
                </Button>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setIsAdding(false);
                    setNewMethod({
                      method: "",
                      contact: "",
                      priority: methods.length + 1,
                      notes: "",
                    });
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        )}

        {methods.length > 0 && (
          <div className='mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg'>
            <p className='text-sm text-gray-700'>
              <strong>ヒント:</strong>{" "}
              優先度の高い順に並んでいます。↑↓ボタンで順番を変更できます。
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
