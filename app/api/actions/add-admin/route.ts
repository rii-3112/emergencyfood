import { NextResponse, type NextRequest } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { teamId, userId: targetUserId } = await request.json();

    if (!teamId || !targetUserId) {
      return NextResponse.json(
        { error: "チームIDとユーザーIDが必要です" },
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

    const isOwner = teamData.ownerId === userId;
    const isAdmin = teamData.admins?.includes(userId) || false;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    if (!teamData.members.includes(targetUserId)) {
      return NextResponse.json(
        { error: "指定されたユーザーはチームのメンバーではありません" },
        { status: 400 }
      );
    }

    const currentAdmins = teamData.admins || [];
    if (currentAdmins.includes(targetUserId)) {
      return NextResponse.json(
        { error: "指定されたユーザーは既に管理者です" },
        { status: 400 }
      );
    }

    const newAdmins = [...currentAdmins, targetUserId];
    await adminDb.collection("teams").doc(teamId).update({
      admins: newAdmins,
    });

    return NextResponse.json({
      success: true,
      message: "管理者を追加しました",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "管理者の追加に失敗しました" },
      { status: 500 }
    );
  }
}
