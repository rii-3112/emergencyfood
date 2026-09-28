"use client";
import { useAuth } from "@/hooks";
import type {
  AgeGroupChecklist,
  PetChecklist,
  Team,
  TeamStockSettings,
} from "@/types";
import {
  AGE_GROUP_LABELS,
  PET_TYPE_EMOJIS,
  PET_TYPE_LABELS,
} from "@/types/handbook";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getSupplyDraftFromHandbookChecklistItem } from "@/utils/checklistSupplyDraft";
import { DEFAULT_TEAM_STOCK_DAYS, UI_CONSTANTS } from "@/utils/constants";
import {
  compositionTotal,
  effectiveDetailedCompositionFlag,
  resolveCompositionFromStockSettings,
} from "@/utils/teamStockComposition";

function resolveNeedsSanitaryFromSavedStock(
  stock: TeamStockSettings | null | undefined
): boolean {
  const explicit = stock?.needsSanitarySupplies;
  if (explicit === true) return true;
  if (explicit === false) return false;
  return true;
}

/** 人数に比例しない・世帯で共有する備蓄チェック（各カードの先頭に表示） */
function createHouseholdSharedAgeGroup(): AgeGroupChecklist {
  return {
    id: "composition-household",
    ageGroup: "household_shared",
    count: 1,
    items: [
      {
        id: "household-stove",
        name: "カセットコンロ（本体）",
        isEssential: true,
      },
      {
        id: "household-gas",
        name: "カセットガス（予備）",
        isEssential: true,
      },
      {
        id: "household-ignition",
        name: "ライター・マッチ（点火用）",
        isEssential: true,
      },
      {
        id: "household-light",
        name: "懐中電灯・ランタン（予備電池）",
        isEssential: true,
      },
      {
        id: "household-radio",
        name: "ラジオ（手回し式または電池式）",
        isEssential: true,
      },
      {
        id: "household-power",
        name: "モバイルバッテリー・充電ケーブル",
        isEssential: true,
      },
      {
        id: "household-tool",
        name: "マルチツール・缶切り",
        isEssential: true,
      },
      {
        id: "household-dishware",
        name: "使い捨て皿・箸・コップ",
        isEssential: false,
      },
      {
        id: "household-sheet",
        name: "タオル・レジャーシート",
        isEssential: false,
      },
      {
        id: "household-wipes",
        name: "ティッシュ・ウェットティッシュ（共用）",
        isEssential: true,
      },
      {
        id: "household-bags",
        name: "ビニール袋・ゴミ袋",
        isEssential: false,
      },
      {
        id: "household-tape",
        name: "養生テープ・ビニールテープ",
        isEssential: false,
      },
      {
        id: "household-cash-docs",
        name: "現金（小額）・身分証・保険証の写し",
        isEssential: true,
      },
    ],
    checkedItems: [],
  };
}

interface SuppliesChecklistProps {
  initialTeamData: Team | null;
  initialChecklistData: {
    checkedItemIds: string[];
    checkedPetItems: { [petType: string]: string[] };
  } | null;
}

/** リスト再生成時: 直前の画面上のチェックを優先（未保存でも外れない）。初めて出る項目のみサーバー値を反映。 */
function mergeRebuildChecklistSelections(
  prev: { ageGroups: AgeGroupChecklist[]; pets: PetChecklist[] },
  initialChecklistData: SuppliesChecklistProps["initialChecklistData"],
  nextAgeGroups: AgeGroupChecklist[],
  nextPets: PetChecklist[]
): void {
  const prevItemIdsChecked = new Set<string>();
  const oldValidItemIds = new Set<string>();
  prev.ageGroups.forEach((g) => {
    g.checkedItems.forEach((id) => prevItemIdsChecked.add(id));
    g.items.forEach((i) => oldValidItemIds.add(i.id));
  });
  prev.pets.forEach((p) => {
    p.checkedItems.forEach((id) => prevItemIdsChecked.add(id));
    p.items.forEach((i) => oldValidItemIds.add(i.id));
  });

  const serverItemIds = new Set(initialChecklistData?.checkedItemIds ?? []);
  const serverPetChecks = initialChecklistData?.checkedPetItems ?? {};

  const nextIds = new Set<string>();
  nextAgeGroups.forEach((g) => g.items.forEach((i) => nextIds.add(i.id)));

  const mergedAgeChecks = new Set<string>();
  for (const id of nextIds) {
    if (oldValidItemIds.has(id)) {
      if (prevItemIdsChecked.has(id)) mergedAgeChecks.add(id);
    } else if (serverItemIds.has(id)) {
      mergedAgeChecks.add(id);
    }
  }

  nextAgeGroups.forEach((group) => {
    group.checkedItems = group.items
      .map((item) => item.id)
      .filter((itemId) => mergedAgeChecks.has(itemId));
  });

  nextPets.forEach((pet) => {
    const prevPet = prev.pets.find((p) => p.petType === pet.petType);
    const oldPetItemIds = new Set(prevPet?.items.map((i) => i.id) ?? []);
    const prevPetChecked = new Set(prevPet?.checkedItems ?? []);
    const serverForPet = new Set(serverPetChecks[pet.petType] ?? []);

    pet.checkedItems = pet.items
      .map((item) => item.id)
      .filter((itemId) => {
        if (oldPetItemIds.has(itemId)) return prevPetChecked.has(itemId);
        return serverForPet.has(itemId);
      });
  });
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

  const initialComposition = resolveCompositionFromStockSettings(
    initialTeamData?.stockSettings ?? null
  );

  // 備蓄管理設定（家族人数の合計は年齢別の人数の合計）
  const [stockDays, setStockDays] = useState(
    initialTeamData?.stockSettings?.stockDays ?? DEFAULT_TEAM_STOCK_DAYS
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
  const [needsSanitarySupplies, setNeedsSanitarySupplies] = useState(() =>
    resolveNeedsSanitaryFromSavedStock(initialTeamData?.stockSettings)
  );
  const [updatingStockSettings, setUpdatingStockSettings] = useState(false);

  const [adultCount, setAdultCount] = useState(initialComposition.adult);
  const [childCount, setChildCount] = useState(initialComposition.child);
  const [infantCount, setInfantCount] = useState(initialComposition.infant);
  const [elderlyCount, setElderlyCount] = useState(initialComposition.elderly);

  const compositionSum = compositionTotal({
    adult: adultCount,
    child: childCount,
    infant: infantCount,
    elderly: elderlyCount,
  });

  // 通知設定
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialTeamData?.stockSettings?.notifications?.enabled !== false
  );
  const [notifyCriticalStock, setNotifyCriticalStock] = useState(
    initialTeamData?.stockSettings?.notifications?.criticalStock !== false
  );
  const [notifyExpiryNear, setNotifyExpiryNear] = useState(
    initialTeamData?.stockSettings?.notifications?.expiryNear !== false
  );
  const [lineLinkStatus, setLineLinkStatus] = useState<
    "loading" | "linked" | "unlinked"
  >("loading");
  const [showLineRequiredModal, setShowLineRequiredModal] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const checklistsRef = useRef(checklists);
  const autoSaveChecklistTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const refreshLineLinkStatus = useCallback(async () => {
    const linked = Boolean(user?.lineUserId);
    setLineLinkStatus(linked ? "linked" : "unlinked");
  }, [user?.lineUserId]);

  useEffect(() => {
    void refreshLineLinkStatus();
  }, [refreshLineLinkStatus]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshLineLinkStatus();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshLineLinkStatus]);

  const handleNotificationsEnabledChange = (checked: boolean) => {
    if (!checked) {
      setNotificationsEnabled(false);
      return;
    }
    if (lineLinkStatus === "unlinked") {
      setShowLineRequiredModal(true);
      return;
    }
    if (lineLinkStatus === "loading") {
      const linked = Boolean(user?.lineUserId);
      if (!linked) {
        setLineLinkStatus("unlinked");
        setShowLineRequiredModal(true);
      } else {
        setLineLinkStatus("linked");
        setNotificationsEnabled(true);
      }
      return;
    }
    setNotificationsEnabled(true);
  };

  useEffect(() => {
    checklistsRef.current = checklists;
  }, [checklists]);

  const persistHandbookChecklistSnapshot = useCallback(
    async (
      snapshot: { ageGroups: AgeGroupChecklist[]; pets: PetChecklist[] },
      options: { quiet?: boolean } = {}
    ): Promise<boolean> => {
      if (!initialTeamData || !user) return false;
      if (snapshot.ageGroups.length === 0 && snapshot.pets.length === 0) {
        return false;
      }

      const checkedItemIds = new Set<string>();
      snapshot.ageGroups.forEach((group) =>
        group.checkedItems.forEach((itemId) => checkedItemIds.add(itemId))
      );
      const checkedPetItems: { [key: string]: string[] } = {};
      snapshot.pets.forEach((pet) => {
        if (pet.checkedItems.length > 0) {
          checkedPetItems[pet.petType] = pet.checkedItems;
        }
      });

      const response = await fetch("/api/handbook/checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkedItemIds: Array.from(checkedItemIds),
          checkedPetItems,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (!options.quiet) {
          setMessage({
            type: "error",
            text:
              typeof result.error === "string"
                ? result.error
                : "チェックリストの保存に失敗しました",
          });
        } else {
          console.warn(
            "ハンドブック自動保存に失敗:",
            typeof result.error === "string" ? result.error : response.status
          );
        }
        return false;
      }

      return true;
    },
    [initialTeamData, user]
  );

  const scheduleChecklistAutosave = useCallback(
    (snapshot?: { ageGroups: AgeGroupChecklist[]; pets: PetChecklist[] }) => {
      if (autoSaveChecklistTimerRef.current) {
        clearTimeout(autoSaveChecklistTimerRef.current);
      }
      autoSaveChecklistTimerRef.current = setTimeout(() => {
        autoSaveChecklistTimerRef.current = null;
        const payload = snapshot ?? checklistsRef.current;
        void persistHandbookChecklistSnapshot(payload, { quiet: true });
      }, 600);
    },
    [persistHandbookChecklistSnapshot]
  );

  const flushPendingChecklistAutosave = useCallback(async () => {
    if (autoSaveChecklistTimerRef.current) {
      clearTimeout(autoSaveChecklistTimerRef.current);
      autoSaveChecklistTimerRef.current = null;
    }
    await persistHandbookChecklistSnapshot(checklistsRef.current, {
      quiet: true,
    });
  }, [persistHandbookChecklistSnapshot]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      if (autoSaveChecklistTimerRef.current) {
        clearTimeout(autoSaveChecklistTimerRef.current);
        autoSaveChecklistTimerRef.current = null;
      }
      void persistHandbookChecklistSnapshot(checklistsRef.current, {
        quiet: true,
      });
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [persistHandbookChecklistSnapshot]);

  // サーバーから渡されたチーム／備蓄設定の変更をフォームへ反映（リロード後など）
  useEffect(() => {
    const stock = initialTeamData?.stockSettings;
    const comp = resolveCompositionFromStockSettings(stock ?? null);
    setAdultCount(comp.adult);
    setChildCount(comp.child);
    setInfantCount(comp.infant);
    setElderlyCount(comp.elderly);
    setNeedsSanitarySupplies(resolveNeedsSanitaryFromSavedStock(stock));
    if (stock) {
      setStockDays(stock.stockDays ?? DEFAULT_TEAM_STOCK_DAYS);
      setHasPets(stock.hasPets ?? false);
      setDogCount(stock.dogCount ?? 0);
      setCatCount(stock.catCount ?? 0);
      setNotificationsEnabled(stock.notifications?.enabled !== false);
      setNotifyCriticalStock(stock.notifications?.criticalStock !== false);
      setNotifyExpiryNear(stock.notifications?.expiryNear !== false);
    }
  }, [initialTeamData]);

  useEffect(() => {
    const stock = initialTeamData?.stockSettings;

    const initialHouseholdSize = stock?.householdSize ?? 1;
    const initialHasPets = stock?.hasPets ?? false;
    const initialDogCount = stock?.dogCount ?? 0;
    const initialCatCount = stock?.catCount ?? 0;

    const currentHasPets = hasPets ?? initialHasPets ?? false;
    const currentDogCount = dogCount ?? initialDogCount ?? 0;
    const currentCatCount = catCount ?? initialCatCount ?? 0;

    const currentUseDetailedComposition = effectiveDetailedCompositionFlag(
      stock ?? null
    );

    const compositionFromForm = {
      adult: adultCount,
      child: childCount,
      infant: infantCount,
      elderly: elderlyCount,
    };

    const currentComposition = currentUseDetailedComposition
      ? compositionFromForm
      : undefined;

    const effectiveHouseholdForSimple = Math.max(
      1,
      compositionTotal(compositionFromForm),
      initialHouseholdSize
    );

    const listPeopleTotal = currentUseDetailedComposition
      ? compositionTotal(compositionFromForm)
      : effectiveHouseholdForSimple;

    const ageGroups: AgeGroupChecklist[] = [];

    if (currentUseDetailedComposition && currentComposition) {
      // 見出しで年齢帯を分けるため、行テキストの「大人：」等は付けない
      if (currentComposition.adult > 0) {
        const adultCount = currentComposition.adult;
        ageGroups.push({
          id: "composition-adult",
          ageGroup: "adult",
          count: adultCount,
          items: [
            {
              id: "adult-water",
              name: `水（1人1日3L${adultCount > 1 ? ` × ${adultCount}人分 = ${adultCount * 3}L/日` : ""}）`,
              isEssential: true,
            },
            {
              id: "adult-food",
              name: `非常食（3日分${adultCount > 1 ? ` × ${adultCount}人` : ""}）`,
              isEssential: true,
            },
            {
              id: "adult-medicine",
              name: `常備薬${adultCount > 1 ? `（${adultCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "adult-clothes",
              name: `着替え${adultCount > 1 ? `（${adultCount}人分）` : ""}`,
              isEssential: false,
            },
            {
              id: "adult-hygiene",
              name: `個人用衛生用品（歯ブラシ・生理用品など）${adultCount > 1 ? `（${adultCount}人分）` : ""}`,
              isEssential: true,
            },
          ],
          checkedItems: [],
        });
      }

      if (currentComposition.child > 0) {
        const childCount = currentComposition.child;
        ageGroups.push({
          id: "composition-child",
          ageGroup: "child",
          count: childCount,
          items: [
            {
              id: "child-water",
              name: `水（1人1日2L${childCount > 1 ? ` × ${childCount}人分 = ${childCount * 2}L/日` : ""}）`,
              isEssential: true,
            },
            {
              id: "child-food",
              name: `子供用非常食${childCount > 1 ? `（${childCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "child-toy",
              name: `おもちゃ・絵本${childCount > 1 ? `（${childCount}人分）` : ""}`,
              isEssential: false,
            },
            {
              id: "child-clothes",
              name: `着替え${childCount > 1 ? `（${childCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "child-diaper",
              name: `おむつ（必要に応じて）${childCount > 1 ? `（${childCount}人分）` : ""}`,
              isEssential: false,
            },
          ],
          checkedItems: [],
        });
      }

      if (currentComposition.infant > 0) {
        const infantCount = currentComposition.infant;
        ageGroups.push({
          id: "composition-infant",
          ageGroup: "infant",
          count: infantCount,
          items: [
            {
              id: "infant-milk",
              name: `粉ミルク${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "infant-water",
              name: `水（調乳用）${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "infant-diaper",
              name: `おむつ${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "infant-clothes",
              name: `ベビー服${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "infant-toy",
              name: `ベビー用品${infantCount > 1 ? `（${infantCount}人分）` : ""}`,
              isEssential: false,
            },
          ],
          checkedItems: [],
        });
      }

      if (currentComposition.elderly > 0) {
        const elderlyCount = currentComposition.elderly;
        ageGroups.push({
          id: "composition-elderly",
          ageGroup: "elderly",
          count: elderlyCount,
          items: [
            {
              id: "elderly-water",
              name: `水（1人1日3L${elderlyCount > 1 ? ` × ${elderlyCount}人分 = ${elderlyCount * 3}L/日` : ""}）`,
              isEssential: true,
            },
            {
              id: "elderly-food",
              name: `介護食・やわらかい食品${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "elderly-medicine",
              name: `薬・医療用品${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "elderly-glasses",
              name: `眼鏡・補聴器${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
              isEssential: true,
            },
            {
              id: "elderly-clothes",
              name: `着替え${elderlyCount > 1 ? `（${elderlyCount}人分）` : ""}`,
              isEssential: true,
            },
          ],
          checkedItems: [],
        });
      }
    } else {
      const totalPeople = effectiveHouseholdForSimple;
      if (totalPeople > 0) {
        ageGroups.push({
          id: "composition-simple",
          ageGroup: "adult",
          count: Math.max(1, listPeopleTotal),
          items: [
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
              name: `個人用衛生用品（歯ブラシ・生理用品など）${totalPeople > 1 ? `（${totalPeople}人分）` : ""}`,
              isEssential: true,
            },
          ],
          checkedItems: [],
        });
      }
    }

    if (ageGroups.length > 0) {
      ageGroups.unshift(createHouseholdSharedAgeGroup());
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

    setChecklists((prev) => {
      mergeRebuildChecklistSelections(
        prev,
        initialChecklistData,
        ageGroups,
        pets
      );
      return { ageGroups, pets };
    });
  }, [
    initialTeamData,
    initialChecklistData,
    hasPets,
    dogCount,
    catCount,
    adultCount,
    childCount,
    infantCount,
    elderlyCount,
  ]);

  const toggleItem = (type: "age" | "pet", groupId: string, itemId: string) => {
    setChecklists((prev) => {
      const next =
        type === "age"
          ? {
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
            }
          : {
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
      scheduleChecklistAutosave(next);
      return next;
    });
  };

  const getProgress = (checkedItems: string[], totalItems: number) => {
    return Math.round((checkedItems.length / totalItems) * 100);
  };

  const [savingChecklist, setSavingChecklist] = useState(false);
  const [registeringSupplyItemId, setRegisteringSupplyItemId] = useState<
    string | null
  >(null);

  const registerChecklistItemToSuppliesList = useCallback(
    async (itemId: string, displayName: string) => {
      if (!initialTeamData || !user) {
        setMessage({
          type: "error",
          text: "ログイン済みグループでのみ備蓄リストに登録できます。",
        });
        return;
      }
      setRegisteringSupplyItemId(itemId);
      try {
        const draft = getSupplyDraftFromHandbookChecklistItem(
          itemId,
          displayName
        );

        const response = await fetch("/api/supplies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId: initialTeamData.id,
            name: draft.name,
            quantity: draft.quantity,
            expiryDate: draft.expiryDate,
            category: draft.category,
            unit: draft.unit,
            label: "ハンドブック",
            storageLocation: "未設定",
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "備蓄リストへの登録に失敗しました"
          );
        }

        setMessage({
          type: "success",
          text: `「${draft.name}」を備蓄リストに登録しました。数量・賞味期限はリストで確認できます。`,
        });
        await flushPendingChecklistAutosave();
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "備蓄リストへの登録に失敗しました",
        });
      } finally {
        setRegisteringSupplyItemId(null);
      }
    },
    [initialTeamData, user, router, flushPendingChecklistAutosave]
  );

  const handleSaveChecklist = async () => {
    if (!initialTeamData || !user) return;

    setSavingChecklist(true);
    try {
      if (autoSaveChecklistTimerRef.current) {
        clearTimeout(autoSaveChecklistTimerRef.current);
        autoSaveChecklistTimerRef.current = null;
      }

      const ok = await persistHandbookChecklistSnapshot(checklists, {
        quiet: false,
      });

      if (!ok) {
        throw new Error("チェックリストの保存に失敗しました");
      }

      setMessage({ type: "success", text: "チェックリストを保存しました" });
      router.refresh();
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

    if (compositionSum < 1) {
      setMessage({
        type: "error",
        text: "家族の合計が1人以上になるよう、年齢別の人数を入力してください",
      });
      return;
    }
    if (compositionSum > 50) {
      setMessage({
        type: "error",
        text: "家族の合計は50人以内にしてください",
      });
      return;
    }

    setUpdatingStockSettings(true);
    try {
      const response = await fetch("/api/team/update-stock-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: initialTeamData.id,
          stockSettings: {
            householdSize: compositionSum,
            stockDays,
            hasPets,
            dogCount,
            catCount,
            useDetailedComposition: true,
            composition: {
              adult: adultCount,
              child: childCount,
              infant: infantCount,
              elderly: elderlyCount,
            },
            notifications: {
              enabled: notificationsEnabled,
              criticalStock: notifyCriticalStock,
              expiryNear: notifyExpiryNear,
            },
            needsSanitarySupplies,
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

  const bannerStock = initialTeamData?.stockSettings ?? null;
  const bannerComposition = bannerStock
    ? resolveCompositionFromStockSettings(bannerStock)
    : null;
  const bannerTotal = bannerComposition
    ? compositionTotal(bannerComposition)
    : 0;

  return (
    <div className='space-y-6'>
      <div className='bg-gray-50 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          チェックポイント1: 年齢別備蓄品チェックリスト
        </h3>
        <p className='text-sm text-gray-700'>
          家族構成に応じた備蓄品の準備しよう
        </p>
      </div>
      {!bannerStock ? (
        <div className='bg-gray-50 p-4 text-gray-800 rounded-md'>
          <p className='font-medium'>家族構成がまだ設定されていません。</p>
          <p className='text-sm mt-2'>
            グループ設定または下の備蓄管理で年齢別の人数を登録すると、家族に合わせたチェックリストが表示されます。
          </p>
        </div>
      ) : (
        <div className='bg-gray-300 p-4 text-gray-800 rounded-md'>
          <p className='font-medium'>家族構成が設定されています。</p>
          <p className='text-sm mt-2'>
            家族人数: {bannerTotal}人
            {bannerComposition ? (
              <span>
                {" "}
                (大人: {bannerComposition.adult}人, 子供:{" "}
                {bannerComposition.child}人, 乳幼児: {bannerComposition.infant}
                人, 高齢者: {bannerComposition.elderly}人)
              </span>
            ) : null}
            {bannerStock.hasPets && (
              <span>
                {" "}
                | ペット: 犬{bannerStock.dogCount}匹, 猫{bannerStock.catCount}匹
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
              年齢別の家族構成に応じて、各備蓄品の推奨在庫量を自動計算します
            </p>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                家族の人数（年齢別の合計）
              </label>
              <div className='flex items-center gap-2'>
                <span className='text-lg font-semibold text-gray-900 tabular-nums'>
                  {compositionSum}
                </span>
                <span className='text-gray-600'>人</span>
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                下の年齢別の人数を入力すると自動で合計されます（1〜50人）
              </p>
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
                ※最低3日分、できれば7日分が目安です。
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
                  <p className='text-xs text-gray-500 mb-3'>
                    ※犬・猫、ほかの動物については種類ごとに必要な備蓄・避難の準備が異なるため、自治体や動物愛護団体などの資料を調べてご確認ください。
                  </p>
                </div>
              )}
            </div>

            <div className='border-t pt-4'>
              <label className='flex items-start gap-2'>
                <input
                  type='checkbox'
                  checked={needsSanitarySupplies}
                  onChange={(e) => setNeedsSanitarySupplies(e.target.checked)}
                  className='rounded mt-0.5 shrink-0'
                />
                <span>
                  <span className='text-sm font-medium text-gray-700'>
                    生理用品などが世帯で必要
                  </span>
                  <span className='block text-xs text-gray-500 mt-1 leading-snug'>
                    不要なときはオフにして保存してください。
                  </span>
                </span>
              </label>
            </div>

            <div className='border-t pt-4'>
              <p className='text-sm font-medium text-gray-900 mb-2'>
                家族構成（年齢別）
              </p>
              <p className='text-xs text-gray-600 mb-3'>
                年齢層ごとに必要な備蓄量が異なります。人数はいつでも変更できます。
              </p>

              <div className='space-y-3 bg-white p-3 rounded border border-gray-200'>
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

                <p className='text-xs text-gray-700 mt-2 font-medium'>
                  合計: {compositionSum}人
                </p>
              </div>
            </div>

            {/* 通知設定 */}
            <div className='border-t pt-4'>
              <label className='flex items-center gap-2 mb-3'>
                <input
                  type='checkbox'
                  checked={notificationsEnabled}
                  onChange={(e) =>
                    handleNotificationsEnabledChange(e.target.checked)
                  }
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
                      checked={notifyExpiryNear}
                      onChange={(e) => setNotifyExpiryNear(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm text-gray-600'>
                      賞味期限が近い通知
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
      {/* 画面上部とも共有メッセージ（備蓄登録・チェック保存など） */}
      {message && (
        <div
          role='status'
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-900 border-green-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
      {/* チェックリスト保存ボタン */}
      <div className='bg-white p-4'>
        <button
          onClick={handleSaveChecklist}
          disabled={savingChecklist}
          className='w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium'
        >
          {savingChecklist ? "保存中..." : "チェックリストを保存"}
        </button>
        {message &&
          message.type === "success" &&
          message.text.includes("チェックリストを保存しました") && (
            <p className='text-sm text-green-600 mt-2'>{message.text}</p>
          )}
      </div>
      {/* 備蓄品チェックリスト */}
      {checklists.ageGroups.map((group) => {
        return (
          <div key={group.id} className='bg-white border rounded-lg p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-lg font-medium text-gray-900'>
                {group.id === "composition-simple"
                  ? "備蓄品チェックリスト"
                  : AGE_GROUP_LABELS[group.ageGroup]}
              </h4>
              <div className='text-sm text-gray-600'>
                進捗: {getProgress(group.checkedItems, group.items.length)}%
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
              {group.items.map((item) => {
                const canRegister = Boolean(user && initialTeamData);
                const registering = registeringSupplyItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className='flex flex-wrap items-start gap-2 p-2 rounded border border-transparent hover:bg-gray-50 hover:border-gray-100'
                  >
                    <label className='flex flex-1 min-w-0 cursor-pointer gap-2 items-start'>
                      <input
                        type='checkbox'
                        checked={group.checkedItems.includes(item.id)}
                        onChange={() => toggleItem("age", group.id, item.id)}
                        className='rounded mt-0.5 shrink-0'
                      />
                      <span
                        className={`text-sm flex-1 min-w-0 ${item.isEssential ? "font-medium text-gray-900" : "text-gray-600"}`}
                      >
                        {item.name}
                        {item.isEssential && (
                          <span className='text-red-500 ml-1'>*</span>
                        )}
                      </span>
                    </label>
                    {!group.checkedItems.includes(item.id) && (
                      <button
                        type='button'
                        disabled={!canRegister || registering}
                        title='チェックとは別に、備蓄リストへ登録します（数量・期限は後から編集できます）'
                        className='shrink-0 text-xs px-2 py-1 rounded border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                        onClick={(e) => {
                          e.preventDefault();
                          void registerChecklistItemToSuppliesList(
                            item.id,
                            item.name
                          );
                        }}
                      >
                        {registering ? "登録中…" : "リストへ登録"}
                      </button>
                    )}
                  </div>
                );
              })}
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
            {pet.items.map((item) => {
              const canRegister = Boolean(user && initialTeamData);
              const registering = registeringSupplyItemId === item.id;
              return (
                <div
                  key={item.id}
                  className='flex flex-wrap items-start gap-2 p-2 rounded border border-transparent hover:bg-gray-50 hover:border-gray-100'
                >
                  <label className='flex flex-1 min-w-0 cursor-pointer gap-2 items-start'>
                    <input
                      type='checkbox'
                      checked={pet.checkedItems.includes(item.id)}
                      onChange={() => toggleItem("pet", pet.petType, item.id)}
                      className='rounded mt-0.5 shrink-0'
                    />
                    <span
                      className={`text-sm flex-1 min-w-0 ${item.isEssential ? "font-medium text-gray-900" : "text-gray-600"}`}
                    >
                      {item.name}
                      {item.isEssential && (
                        <span className='text-red-500 ml-1'>*</span>
                      )}
                    </span>
                  </label>
                  {!pet.checkedItems.includes(item.id) && (
                    <button
                      type='button'
                      disabled={!canRegister || registering}
                      title='チェックとは別に、備蓄リストへ登録します（数量・期限は後から編集できます）'
                      className='shrink-0 text-xs px-2 py-1 rounded border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      onClick={(e) => {
                        e.preventDefault();
                        void registerChecklistItemToSuppliesList(
                          item.id,
                          item.name
                        );
                      }}
                    >
                      {registering ? "登録中…" : "リストへ登録"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {showLineRequiredModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-500/35 backdrop-blur-sm p-4'>
          <div
            className='bg-white rounded-lg p-6 max-w-md w-full shadow-lg'
            role='dialog'
            aria-modal='true'
            aria-labelledby='handbook-line-required-title'
          >
            <h3
              id='handbook-line-required-title'
              className='text-lg font-semibold text-gray-900 mb-2'
            >
              LINE連携が必要です
            </h3>
            <p className='text-sm text-gray-600 mb-6'>
              通知はLINEでお知らせします。先にLINEアカウントを連携してください。
            </p>
            <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2'>
              <button
                type='button'
                onClick={() => setShowLineRequiredModal(false)}
                className='w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors'
              >
                閉じる
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowLineRequiredModal(false);
                  router.push("/settings?tab=line");
                }}
                className='w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors'
              >
                {UI_CONSTANTS.LINE_NOTIFICATION_SETTINGS}へ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
