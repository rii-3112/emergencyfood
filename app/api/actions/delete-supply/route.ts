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
    const _userId = decodedToken.uid;

    const { supplyId } = await request.json();

    if (!supplyId) {
      return NextResponse.json(
        { error: "備蓄品IDが必要です" },
        { status: 400 }
      );
    }

    const supplyDoc = await adminDb.collection("supplies").doc(supplyId).get();
    if (!supplyDoc.exists) {
      return NextResponse.json(
        { error: "備蓄品が見つかりません" },
        { status: 404 }
      );
    }

    const suppliesData = supplyDoc.data();
    if (!suppliesData) {
      return NextResponse.json(
        { error: "備蓄品データが見つかりません" },
        { status: 404 }
      );
    }

    const supplyTeamId = suppliesData.teamId;
    const userTeamId = decodedToken.teamId;

    if (supplyTeamId !== userTeamId) {
      return NextResponse.json(
        { error: "この備蓄品を削除する権限がありません" },
        { status: 403 }
      );
    }

    await adminDb.collection("supplies").doc(supplyId).delete();

    const reviewsQuery = await adminDb
      .collection("reviews")
      .where("supplyId", "==", supplyId)
      .get();
    const deletePromises = reviewsQuery.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: "備蓄品を削除しました",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "備蓄品の削除に失敗しました" },
      { status: 500 }
    );
  }
}
