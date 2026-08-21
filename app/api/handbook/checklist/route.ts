import { requireApiUser } from "@/utils/auth/server";
import { NextResponse, type NextRequest } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

interface HandbookChecklistData {
  checkedItemIds: string[];
  checkedPetItems: { [petType: string]: string[] };
  lastUpdated: Date;
  lastUpdatedBy: string;
  ageGroups?: any[];
  pets?: any[];
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = user.teamId as string;

    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    const checklistDoc = await adminDb
      .collection("handbook-checklists")
      .doc(teamId)
      .get();

    if (!checklistDoc.exists) {
      return NextResponse.json({ data: null });
    }

    const data = checklistDoc.data();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Handbook checklist fetch error:", error);
    return NextResponse.json(
      { error: "チェックリストの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = user.teamId as string;

    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (body.checkedItemIds) {
      const checklistData: HandbookChecklistData = {
        checkedItemIds: body.checkedItemIds || [],
        checkedPetItems: body.checkedPetItems || {},
        lastUpdated: new Date(),
        lastUpdatedBy: user.displayName || user.email || "ユーザー",
      };

      await adminDb
        .collection("handbook-checklists")
        .doc(teamId)
        .set(checklistData, { merge: true });

      return NextResponse.json({
        success: true,
        message: "チェックリストを保存しました",
      });
    }

    const checkedItemIds = new Set<string>();
    body.ageGroups?.forEach((group: any) => {
      group.checkedItems?.forEach((itemId: string) => {
        checkedItemIds.add(itemId);
      });
    });

    const checkedPetItems: { [key: string]: string[] } = {};
    body.pets?.forEach((pet: any) => {
      if (pet.checkedItems && pet.checkedItems.length > 0) {
        checkedPetItems[pet.petType] = pet.checkedItems;
      }
    });

    const checklistData: HandbookChecklistData = {
      checkedItemIds: Array.from(checkedItemIds),
      checkedPetItems,
      lastUpdated: new Date(),
      lastUpdatedBy: user.displayName || user.email || "ユーザー",
    };

    await adminDb
      .collection("handbook-checklists")
      .doc(teamId)
      .set(checklistData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "チェックリストを保存しました",
    });
  } catch (error) {
    console.error("Handbook checklist save error:", error);
    return NextResponse.json(
      { error: "チェックリストの保存に失敗しました" },
      { status: 500 }
    );
  }
}
