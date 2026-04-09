import { NextResponse, type NextRequest } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { teamId } = await params;

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

    const ownerId = teamData.ownerId || teamData.createdBy;
    const admins = teamData.admins || [ownerId];

    if (!teamData.members.includes(userId)) {
      return NextResponse.json(
        { error: "このチームのメンバーではありません" },
        { status: 403 }
      );
    }

    const memberIds = [...new Set([...teamData.members, ownerId])];

    const userRecords = await Promise.all(
      memberIds.map((id) => adminAuth.getUser(id))
    );

    const members = userRecords
      .filter((userRecord) => userRecord)
      .map((userRecord) => {
        const uid = userRecord.uid;
        let role: "owner" | "admin" | "member" = "member";

        if (uid === ownerId) {
          role = "owner";
        } else if (admins.includes(uid)) {
          role = "admin";
        }

        return {
          uid,
          email: userRecord.email,
          displayName: userRecord.displayName || null,
          role,
        };
      })
      .filter(Boolean);

    const team = {
      id: teamDoc.id,
      name: teamData.name,
      ownerId: ownerId,
      admins: admins,
      members: teamData.members,
      createdAt: teamData.createdAt,
      createdBy: teamData.createdBy,
      stockSettings: teamData.stockSettings || undefined,
    };

    return NextResponse.json({
      team,
      members,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "チーム情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
