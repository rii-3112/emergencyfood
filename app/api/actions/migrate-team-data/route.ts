import { requireApiUser } from "@/utils/auth/server";
import { NextResponse, type NextRequest } from "next/server";

import { adminDb } from "@/utils/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.uid;

    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return NextResponse.json(
        { error: "チームが見つかりません" },
        { status: 404 }
      );
    }

    const teamData = teamDoc.data();
    if (!teamData) {
      return NextResponse.json(
        { error: "チームデータが見つかりません" },
        { status: 404 }
      );
    }

    if (!teamData.members.includes(userId)) {
      return NextResponse.json(
        { error: "このチームのメンバーではありません" },
        { status: 403 }
      );
    }

    const needsMigration = !teamData.ownerId || !teamData.admins;

    if (!needsMigration) {
      return NextResponse.json({
        success: true,
        message: "チームデータは既に最新の形式です",
        migrated: false,
      });
    }

    const ownerId = teamData.ownerId || teamData.createdBy;
    const admins = teamData.admins || [ownerId];

    await adminDb.collection("teams").doc(teamId).update({
      ownerId: ownerId,
      admins: admins,
    });

    return NextResponse.json({
      success: true,
      message: "チームデータを最新の形式に移行しました",
      migrated: true,
      data: {
        ownerId,
        admins,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "チームデータの移行に失敗しました" },
      { status: 500 }
    );
  }
}
