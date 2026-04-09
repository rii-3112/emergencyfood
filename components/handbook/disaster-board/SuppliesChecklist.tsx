"use client";
import { useAuth } from "@/hooks";
import type { AgeGroupChecklist, PetChecklist, Team } from "@/types";
import {
  type SupplyItem,
  PET_TYPE_EMOJIS,
  PET_TYPE_LABELS,
} from "@/types/handbook";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SuppliesChecklistProps {
  initialTeamData: Team | null;
  initialChecklistData: {
    checkedItemIds: string[];
    checkedPetItems: { [petType: string]: string[] };
  } | null;
}

export default function SuppliesChecklist({
  initialTeamData,
  initialChecklistData,
}: SuppliesChecklistProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [checklists, setChecklists] = useState<{
    ageGroups: AgeGroupChecklist[];
    pets: PetChecklist[];
  }>({
    ageGroups: [],
    pets: [],
  });

  // 備蓄管理設定
  const [householdSize, setHouseholdSize] = useState(
    initialTeamData?.stockSettings?.householdSize || 1
  );
  const [stockDays, setStockDays] = useState(
    initialTeamData?.stockSettings?.stockDays || 7
  );
  const [hasPets, setHasPets] = useState(
    initialTeamData?.stockSettings?.hasPets || false
  );
  const [dogCount, setDogCount] = useState(
    initialTeamData?.stockSettings?.dogCount ?? 0
  );
  const [catCount, setCatCount] = useState(
    initialTeamData?.stockSettings?.catCount ?? 0
  );
  const [updatingStockSettings, setUpdatingStockSettings] = useState(false);

  // 詳細設定
  const [useDetailedComposition, setUseDetailedComposition] = useState(
    initialTeamData?.stockSettings?.useDetailedComposition || false
  );
  const [adultCount, setAdultCount] = useState(
    initialTeamData?.stockSettings?.composition?.adult || 0
  );
  const [childCount, setChildCount] = useState(
    initialTeamData?.stockSettings?.composition?.child || 0
  );
  const [infantCount, setInfantCount] = useState(
    initialTeamData?.stockSettings?.composition?.infant || 0
  );
  const [elderlyCount, setElderlyCount] = useState(
    initialTeamData?.stockSettings?.composition?.elderly || 0
  );

  // 通知設定
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialTeamData?.stockSettings?.notifications?.enabled !== false
  );
  const [notifyCriticalStock, setNotifyCriticalStock] = useState(
    initialTeamData?.stockSettings?.notifications?.criticalStock !== false
  );
  const [notifyLowStock, setNotifyLowStock] = useState(
    initialTeamData?.stockSettings?.notifications?.lowStock !== false
  );
  const [notifyExpiryNear, setNotifyExpiryNear] = useState(
    initialTeamData?.stockSettings?.notifications?.expiryNear !== false
  );
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(
    initialTeamData?.stockSettings?.notifications?.weeklyReport || false
  );
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!initialTeamData?.stockSettings) {
      // 初期設定時も1つのチェックリストで人数を含む
      setChecklists({
        ageGroups: [
          {
            id: "adult",
            ageGroup: "adult",
            count: 1,
            items: [
              {
                id: "adult-water",
                name: "水（1人1日3L）",
                isEssential: true,
              },
              {
                id: "adult-food",
                name: "非常食（3日分）",
                isEssential: true,
              },
              { id: "adult-medicine", name: "常備薬", isEssential: true },
              { id: "adult-clothes", name: "着替え", isEssential: false },
              { id: "adult-hygiene", name: "衛生用品", isEssential: true },
            ],
            checkedItems: [],
          },
        ],
        pets: [],
      });
      return;
    }

    const {
      householdSize: initialHouseholdSize,
      hasPets: initialHasPets,
      dogCount: initialDogCount,
      catCount: initialCatCount,
      useDetailedComposition: initialUseDetailedComposition,
      composition: initialComposition,
    } = initialTeamData.stockSettings;

    // コンポーネントのstateの値を使用（設定変更時に即時反映）
    const currentHouseholdSize = householdSize ?? initialHouseholdSize ?? 1;
    const currentHasPets = hasPets ?? initialHasPets ?? false;
    const currentDogCount = dogCount ?? initialDogCount ?? 0;
    const currentCatCount = catCount ?? initialCatCount ?? 0;
    const currentUseDetailedComposition =
      useDetailedComposition ?? initialUseDetailedComposition ?? false;
    const currentComposition = currentUseDetailedComposition
      ? {
          adult: adultCount || initialComposition?.adult || 0,
          child: childCount || initialComposition?.child || 0,
          infant: infantCount || initialComposition?.infant || 0,
          elderly: elderlyCount || initialComposition?.elderly || 0,
        }
      : initialComposition;

    const ageGroups: AgeGroupChecklist[] = [];
    const allItems: SupplyItem[] = [];

    if (currentUseDetailedComposition && currentComposition) {
      // 大人のアイテムをリストに追加
      if (currentComposition.adult > 0) {
        const adultCount = currentComposition.adult;
        allItems.push(
          {
            id: "adult-water",
            name: `大人：水（1人1日3L${adultCount > 1 ? ` × ${adultCount}人分 = ${adultCount * 3}L/日` : ""}）`,
            isEssential: true,
          },
          {
            id: "adult-food",
            name: `大人：非常食（3日分${adultCount > 1 ? ` × ${adultCount}人` : ""}）`,
            isEssential: true,
          },
          {
            id: "adult-medicine",
            name: `大人：常備薬${adultCount > 1 ? `（${adultCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "adult-clothes",
            name: `大人：着替え${adultCount > 1 ? `（${adultCount}人分）` : ""}`,
            isEssential: false,
          },
          {
            id: "adult-hygiene",
            name: `大人：衛生用品${adultCount > 1 ? `（${adultCount}人分）` : ""}`,
            isEssential: true,
          }
        );
      }

      // 子供のアイテムをリストに追加
      if (currentComposition.child > 0) {
        const childCount = currentComposition.child;
        allItems.push(
          {
            id: "child-water",
            name: `子供：水（1人1日2L${childCount > 1 ? ` × ${childCount}人分 = ${childCount * 2}L/日` : ""}）`,
            isEssential: true,
          },
          {
            id: "child-food",
            name: `子供：子供用非常食${childCount > 1 ? `（${childCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "child-toy",
            name: `子供：おもちゃ・絵本${childCount > 1 ? `（${childCount}人分）` : ""}`,
            isEssential: false,
          },
          {
            id: "child-clothes",
            name: `子供：着替え${childCount > 1 ? `（${childCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "child-diaper",
            name: `子供：おむつ（必要に応じて）${childCount > 1 ? `（${childCount}人分）` : ""}`,
            isEssential: false,
          }
        );
      }

      // 乳幼児のアイテムをリストに追加
      if (currentComposition.infant > 0) {
        const infantCount = currentComposition.infant;
        allItems.push(
          {
            id: "infant-milk",
            name: `乳幼児：粉ミルク${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "infant-water",
            name: `乳幼児：水（調乳用）${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "infant-diaper",
            name: `乳幼児：おむつ${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "infant-clothes",
            name: `乳幼児：ベビー服${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "infant-toy",
            name: `乳幼児：ベビー用品${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
            isEssential: false,
          }
        );
      }

      // 高齢者のアイテムをリストに追加
      if (currentComposition.elderly > 0) {
        const elderlyCount = currentComposition.elderly;
        allItems.push(
          {
            id: "elderly-water",
            name: `高齢者：水（1人1日3L${elderlyCount > 1 ? ` × ${elderlyCount}人分 = ${elderlyCount * 3}L/日` : ""}）`,
            isEssential: true,
          },
          {
            id: "elderly-food",
            name: `高齢者：介護食・やわらかい食品${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "elderly-medicine",
            name: `高齢者：薬・医療用品${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "elderly-glasses",
            name: `高齢者：眼鏡・補聴器${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "elderly-clothes",
            name: `高齢者：着替え${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
            isEssential: true,
          }
        );
      }
    } else {
      // 詳細設定が無効な場合
      const totalPeople = currentHouseholdSize;
      if (totalPeople > 0) {
        allItems.push(
          {
            id: "adult-water",
            name: `水（1人1日3L${totalPeople > 1 ? ` × ${totalPeople}人分 = ${totalPeople * 3}L/日` : ""}）`,
            isEssential: true,
          },
          {
            id: "adult-food",
            name: `非常食（3日分${totalPeople > 1 ? ` × ${totalPeople}人` : ""}）`,
            isEssential: true,
          },
          {
            id: "adult-medicine",
            name: `常備薬${totalPeople > 1 ? `（${totalPeople}人分）` : ""}`,
            isEssential: true,
          },
          {
            id: "adult-clothes",
            name: `着替え${totalPeople > 1 ? `（${totalPeople}人分）` : ""}`,
            isEssential: false,
          },
          {
            id: "adult-hygiene",
            name: `衛生用品${totalPeople > 1 ? `（${totalPeople}人分）` : ""}`,
            isEssential: true,
          }
        );
      }
    }

    // 1つのチェックリストグループとして作成
    if (allItems.length > 0) {
      ageGroups.push({
        id: "all",
        ageGroup: "adult", // 型互換性のため（実際には表示で使用しない）
        count: currentHouseholdSize,
        items: allItems,
        checkedItems: [],
      });
    }

    const pets: PetChecklist[] = [];

    if (currentHasPets) {
      if (currentDogCount > 0) {
        pets.push({
          petType: "dog",
          count: currentDogCount,
          items: [
            {
              id: "dog-food",
              name: "ドッグフード（7日分）",
              isEssential: true,
            },
            { id: "dog-water", name: "水", isEssential: true },
            { id: "dog-medicine", name: "ペット用薬", isEssential: true },
            { id: "dog-leash", name: "リード・首輪", isEssential: true },
            { id: "dog-toy", name: "おもちゃ", isEssential: false },
          ],
          checkedItems: [],
        });
      }

      if (currentCatCount > 0) {
        pets.push({
          petType: "cat",
          count: currentCatCount,
          items: [
            {
              id: "cat-food",
              name: "キャットフード（7日分）",
              isEssential: true,
            },
            { id: "cat-water", name: "水", isEssential: true },
            { id: "cat-litter", name: "猫砂", isEssential: true },
            { id: "cat-carrier", name: "キャリーケース", isEssential: true },
            { id: "cat-toy", name: "おもちゃ", isEssential: false },
          ],
          checkedItems: [],
        });
      }
    }

    // 保存されたチェックリストの状態をマージ
    // アイテムIDは固定なので、アイテムタイプベースで復元
    if (initialChecklistData) {
      const checkedItemIdsSet = new Set(
        initialChecklistData.checkedItemIds || []
      );

      // 年齢層のチェック状態を復元（アイテムIDが一致するものを復元）
      ageGroups.forEach((group) => {
        group.checkedItems = group.items
          .map((item) => item.id)
          .filter((itemId) => checkedItemIdsSet.has(itemId));
      });

      // ペットのチェック状態を復元
      pets.forEach((pet) => {
        const savedCheckedItems =
          initialChecklistData.checkedPetItems?.[pet.petType];
        if (savedCheckedItems) {
          pet.checkedItems = savedCheckedItems.filter((itemId) =>
            pet.items.some((item) => item.id === itemId)
          );
        }
      });
    }

    setChecklists({ ageGroups, pets });
  }, [
    initialTeamData,
    initialChecklistData,
    householdSize,
    hasPets,
    dogCount,
    catCount,
    useDetailedComposition,
    adultCount,
    childCount,
    infantCount,
    elderlyCount,
  ]);

  const toggleItem = (type: "age" | "pet", groupId: string, itemId: string) => {
    setChecklists((prev) => {
      if (type === "age") {
        return {
          ...prev,
          ageGroups: prev.ageGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  checkedItems: group.checkedItems.includes(itemId)
                    ? group.checkedItems.filter((id) => id !== itemId)
                    : [...group.checkedItems, itemId],
                }
              : group
          ),
        };
      } else {
        return {
          ...prev,
          pets: prev.pets.map((pet) =>
            pet.petType === groupId
              ? {
                  ...pet,
                  checkedItems: pet.checkedItems.includes(itemId)
                    ? pet.checkedItems.filter((id) => id !== itemId)
                    : [...pet.checkedItems, itemId],
                }
              : pet
          ),
        };
      }
    });
  };

  const getProgress = (checkedItems: string[], totalItems: number) => {
    return Math.round((checkedItems.length / totalItems) * 100);
  };

  const [savingChecklist, setSavingChecklist] = useState(false);

  const handleSaveChecklist = async () => {
    if (!initialTeamData || !user) return;

    setSavingChecklist(true);
    try {
      const idToken = await user.getIdToken();
      if (!idToken) {
        throw new Error("認証トークンを取得できませんでした");
      }

      // チェック済みアイテムIDを収集（重複除去）
      const checkedItemIds = new Set<string>();
      checklists.ageGroups.forEach((group) => {
        group.checkedItems.forEach((itemId) => {
          checkedItemIds.add(itemId);
        });
      });

      // ペットのチェック済みアイテム
      const checkedPetItems: { [key: string]: string[] } = {};
      checklists.pets.forEach((pet) => {
        if (pet.checkedItems.length > 0) {
          checkedPetItems[pet.petType] = pet.checkedItems;
        }
      });

      const response = await fetch("/api/handbook/checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          checkedItemIds: Array.from(checkedItemIds),
          checkedPetItems,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "チェックリストを保存しました" });
        router.refresh();
      } else {
        throw new Error(result.error || "チェックリストの保存に失敗しました");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "チェックリストの保存に失敗しました",
      });
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleUpdateStockSettings = async () => {
    if (!initialTeamData) return;

    setUpdatingStockSettings(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error("認証トークンを取得できませんでした");
      }

      const response = await fetch("/api/team/update-stock-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          teamId: initialTeamData.id,
          stockSettings: {
            householdSize,
            stockDays,
            hasPets,
            dogCount,
            catCount,
            useDetailedComposition,
            composition: useDetailedComposition
              ? {
                  adult: adultCount,
                  child: childCount,
                  infant: infantCount,
                  elderly: elderlyCount,
                }
              : undefined,
            notifications: {
              enabled: notificationsEnabled,
              criticalStock: notifyCriticalStock,
              lowStock: notifyLowStock,
              expiryNear: notifyExpiryNear,
              weeklyReport: notifyWeeklyReport,
            },
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "備蓄管理設定を保存しました" });
        router.refresh();
      } else {
        throw new Error(result.error || "設定の保存に失敗しました");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "設定の保存に失敗しました",
      });
    } finally {
      setUpdatingStockSettings(false);
    }
  };

  const _handleGoToSettings = () => {
    router.push("/settings");
  };

  return (
    <div className='space-y-6'>
      <div className='bg-gray-50 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          チェックポイント1: 年齢別備蓄品チェックリスト
        </h3>
        <p className='text-sm text-gray-700'>
          家族構成に応じた備蓄品の準備状況をチェックしましょう
        </p>
      </div>
      {!initialTeamData?.stockSettings ? (
        <div className='bg-gray-50 p-4 text-gray-800 rounded-md'>
          <p className='font-medium'>家族構成の設定がありません。</p>
          <p className='text-sm mt-2'>
            設定ページで家族構成を設定すると、より詳細なチェックリストが表示されます。
          </p>
        </div>
      ) : (
        <div className='bg-gray-300 p-4 text-gray-800 rounded-md'>
          <p className='font-medium'>家族構成が設定されています。</p>
          <p className='text-sm mt-2'>
            家族人数: {initialTeamData.stockSettings.householdSize}人
            {initialTeamData.stockSettings.useDetailedComposition &&
              initialTeamData.stockSettings.composition && (
                <span>
                  {" "}
                  (大人: {initialTeamData.stockSettings.composition.adult}人,
                  子供: {initialTeamData.stockSettings.composition.child}人,
                  乳幼児: {initialTeamData.stockSettings.composition.infant}人,
                  高齢者: {initialTeamData.stockSettings.composition.elderly}人)
                </span>
              )}
            {initialTeamData.stockSettings.hasPets && (
              <span>
                {" "}
                | ペット: 犬{initialTeamData.stockSettings.dogCount}匹, 猫
                {initialTeamData.stockSettings.catCount}匹
              </span>
            )}
          </p>
        </div>
      )}{" "}
      {/* 備蓄管理設定 */}
      <div className='mt-4 sm:mt-6 bg-gray-50 rounded-lg overflow-hidden border border-gray-200'>
        <button
          onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
          className='w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-100 transition-colors'
        >
          <h4 className='text-sm font-medium text-gray-900'>備蓄管理の設定</h4>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${
              isSettingsExpanded ? "transform rotate-180" : ""
            }`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 9l-7 7-7-7'
            />
          </svg>
        </button>

        {isSettingsExpanded && (
          <div className='px-3 sm:px-4 pb-3 sm:pb-4 space-y-4'>
            <p className='text-sm text-gray-700'>
              家族構成に応じて、各備蓄品の推奨在庫量を自動計算します
            </p>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                家族の人数 <span className='text-red-500'>*</span>
              </label>
              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  min='1'
                  max='50'
                  value={householdSize}
                  onChange={(e) =>
                    setHouseholdSize(parseInt(e.target.value) || 1)
                  }
                  className='w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <span className='text-gray-600'>人</span>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                目標備蓄日数 <span className='text-red-500'>*</span>
              </label>
              <select
                value={stockDays}
                onChange={(e) => setStockDays(parseInt(e.target.value))}
                className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='3'>3日分</option>
                <option value='7'>7日分（推奨）</option>
                <option value='14'>14日分</option>
                <option value='30'>30日分</option>
              </select>
              <p className='text-xs text-gray-500 mt-1'>
                ※ 政府推奨：最低3日分（1週間分以上が望ましい。広域災害に備えて）
              </p>
            </div>

            <div className='border-t pt-4'>
              <label className='flex items-center gap-2 mb-3'>
                <input
                  type='checkbox'
                  checked={hasPets}
                  onChange={(e) => setHasPets(e.target.checked)}
                  className='rounded'
                />
                <span className='text-sm font-medium text-gray-700'>
                  ペットがいる
                </span>
              </label>

              {hasPets && (
                <div className='ml-6 space-y-3'>
                  <div>
                    <label className='block text-sm text-gray-600 mb-1'>
                      犬の匹数
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        min='0'
                        max='10'
                        value={dogCount}
                        onChange={(e) =>
                          setDogCount(parseInt(e.target.value) || 0)
                        }
                        className='w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500'
                      />
                      <span className='text-gray-600'>匹</span>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm text-gray-600 mb-1'>
                      猫の匹数
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        min='0'
                        max='10'
                        value={catCount}
                        onChange={(e) =>
                          setCatCount(parseInt(e.target.value) || 0)
                        }
                        className='w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500'
                      />
                      <span className='text-gray-600'>匹</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className='border-t pt-4'>
              <label className='flex items-center gap-2 mb-3'>
                <input
                  type='checkbox'
                  checked={useDetailedComposition}
                  onChange={(e) => setUseDetailedComposition(e.target.checked)}
                  className='rounded'
                />
                <span className='text-sm font-medium text-gray-700'>
                  詳細な家族構成を設定（より正確な計算）
                </span>
              </label>

              {useDetailedComposition && (
                <div className='ml-6 space-y-3 bg-white p-3 rounded border border-gray-200'>
                  <p className='text-xs text-gray-600 mb-2'>
                    年齢層ごとに必要な備蓄量が異なります
                  </p>

                  <div>
                    <label className='block text-sm text-gray-600 mb-1'>
                      大人（18-64歳）
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        min='0'
                        max='20'
                        value={adultCount}
                        onChange={(e) =>
                          setAdultCount(parseInt(e.target.value) || 0)
                        }
                        className='w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                      <span className='text-gray-600'>人</span>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm text-gray-600 mb-1'>
                      子供（6-17歳）
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        min='0'
                        max='10'
                        value={childCount}
                        onChange={(e) =>
                          setChildCount(parseInt(e.target.value) || 0)
                        }
                        className='w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                      <span className='text-gray-600'>人</span>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm text-gray-600 mb-1'>
                      乳幼児（0-5歳）
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        min='0'
                        max='5'
                        value={infantCount}
                        onChange={(e) =>
                          setInfantCount(parseInt(e.target.value) || 0)
                        }
                        className='w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                      <span className='text-gray-600'>人</span>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm text-gray-600 mb-1'>
                      高齢者（65歳以上）
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        min='0'
                        max='10'
                        value={elderlyCount}
                        onChange={(e) =>
                          setElderlyCount(parseInt(e.target.value) || 0)
                        }
                        className='w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                      <span className='text-gray-600'>人</span>
                    </div>
                  </div>

                  <p className='text-xs text-gray-600 mt-2'>
                    合計: {adultCount + childCount + infantCount + elderlyCount}
                    人
                  </p>
                </div>
              )}
            </div>

            {/* 通知設定 */}
            <div className='border-t pt-4'>
              <label className='flex items-center gap-2 mb-3'>
                <input
                  type='checkbox'
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className='rounded'
                />
                <span className='text-sm font-medium text-gray-700'>
                  通知機能を有効にする
                </span>
              </label>

              {notificationsEnabled && (
                <div className='ml-6 space-y-2'>
                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={notifyCriticalStock}
                      onChange={(e) => setNotifyCriticalStock(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm text-gray-600'>
                      在庫切れの通知
                    </span>
                  </label>

                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={notifyLowStock}
                      onChange={(e) => setNotifyLowStock(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm text-gray-600'>
                      在庫不足の通知
                    </span>
                  </label>

                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={notifyExpiryNear}
                      onChange={(e) => setNotifyExpiryNear(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm text-gray-600'>
                      賞味期限が近い通知
                    </span>
                  </label>

                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={notifyWeeklyReport}
                      onChange={(e) => setNotifyWeeklyReport(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm text-gray-600'>
                      週次レポートの通知
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* メッセージ表示 */}
            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-green-100 text-green-300"
                    : "bg-red-100 text-red-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={handleUpdateStockSettings}
              disabled={updatingStockSettings}
              className='w-full px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm'
            >
              {updatingStockSettings ? "保存中..." : "設定を保存"}
            </button>
          </div>
        )}
      </div>
      {/* チェックリスト保存ボタン */}
      <div className='bg-white border rounded-lg p-4'>
        <button
          onClick={handleSaveChecklist}
          disabled={savingChecklist}
          className='w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium'
        >
          {savingChecklist ? "保存中..." : "チェックリストを保存"}
        </button>
        {message &&
          message.type === "success" &&
          message.text.includes("チェックリスト") && (
            <p className='text-sm text-green-600 mt-2'>{message.text}</p>
          )}
      </div>
      {/* 備蓄品チェックリスト */}
      {checklists.ageGroups.map((group) => {
        return (
          <div key={group.id} className='bg-white border rounded-lg p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-lg font-medium text-gray-900'>
                備蓄品チェックリスト
              </h4>
              <div className='text-sm text-gray-600'>
                進捗: {getProgress(group.checkedItems, group.items.length)}%
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
              {group.items.map((item) => (
                <label
                  key={item.id}
                  className='flex items-center space-x-2 p-2 hover:bg-gray-50 rounded'
                >
                  <input
                    type='checkbox'
                    checked={group.checkedItems.includes(item.id)}
                    onChange={() => toggleItem("age", group.id, item.id)}
                    className='rounded'
                  />
                  <span
                    className={`text-sm ${item.isEssential ? "font-medium text-gray-900" : "text-gray-600"}`}
                  >
                    {item.name}
                    {item.isEssential && (
                      <span className='text-red-500 ml-1'>*</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {/* ペット別チェックリスト */}
      {checklists.pets.map((pet) => (
        <div key={pet.petType} className='bg-white border rounded-lg p-4'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-lg font-medium text-gray-900'>
              {PET_TYPE_EMOJIS[pet.petType]} {PET_TYPE_LABELS[pet.petType]}
              <span className='text-sm text-gray-600 ml-2'>
                ({pet.count}匹)
              </span>
            </h4>
            <div className='text-sm text-gray-600'>
              進捗: {getProgress(pet.checkedItems, pet.items.length)}%
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            {pet.items.map((item) => (
              <label
                key={item.id}
                className='flex items-center space-x-2 p-2 hover:bg-gray-50 rounded'
              >
                <input
                  type='checkbox'
                  checked={pet.checkedItems.includes(item.id)}
                  onChange={() => toggleItem("pet", pet.petType, item.id)}
                  className='rounded'
                />
                <span
                  className={`text-sm ${item.isEssential ? "font-medium text-gray-900" : "text-gray-600"}`}
                >
                  {item.name}
                  {item.isEssential && (
                    <span className='text-red-500 ml-1'>*</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
