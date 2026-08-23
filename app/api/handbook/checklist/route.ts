import { requireApiUser } from "@/utils/auth/server";
import { NextResponse, type NextRequest } from "next/server";

import {
  findHandbookChecklistByTeamId,
  upsertHandbookChecklist,
} from "@/lib/repositories/handbook";
import { isTeamMember } from "@/lib/repositories/team";

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

    const data = await findHandbookChecklistByTeamId(teamId);
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

    if (!(await isTeamMember(teamId, user.uid))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const lastUpdatedBy = user.displayName || user.email || "ユーザー";

    if (body.checkedItemIds) {
      await upsertHandbookChecklist(teamId, {
        checkedItemIds: body.checkedItemIds || [],
        checkedPetItems: body.checkedPetItems || {},
        lastUpdatedBy,
      });

      return NextResponse.json({
        success: true,
        message: "チェックリストを保存しました",
      });
    }

    const checkedItemIds = new Set<string>();
    body.ageGroups?.forEach((group: { checkedItems?: string[] }) => {
      group.checkedItems?.forEach((itemId: string) => {
        checkedItemIds.add(itemId);
      });
    });

    const checkedPetItems: Record<string, string[]> = {};
    body.pets?.forEach((pet: { petType: string; checkedItems?: string[] }) => {
      if (pet.checkedItems && pet.checkedItems.length > 0) {
        checkedPetItems[pet.petType] = pet.checkedItems;
      }
    });

    await upsertHandbookChecklist(teamId, {
      checkedItemIds: Array.from(checkedItemIds),
      checkedPetItems,
      lastUpdatedBy,
    });

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
