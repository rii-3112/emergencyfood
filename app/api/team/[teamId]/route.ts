import { NextResponse, type NextRequest } from "next/server";

import { requireApiUser } from "@/utils/auth/server";
import { adminDb } from "@/utils/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.uid;

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

    const userDocs = await Promise.all(
      memberIds.map((id) => adminDb.collection("users").doc(id).get())
    );

    const members = userDocs
      .filter((userDoc) => userDoc.exists)
      .map((userDoc) => {
        const uid = userDoc.id;
        const userData = userDoc.data();
        let role: "owner" | "admin" | "member" = "member";

        if (uid === ownerId) {
          role = "owner";
        } else if (admins.includes(uid)) {
          role = "admin";
        }

        return {
          uid,
          email: userData?.email ?? null,
          displayName: userData?.displayName || null,
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
