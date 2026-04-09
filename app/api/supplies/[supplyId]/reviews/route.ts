import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { adminAuth, adminDb } from "@/utils/firebase/admin";

interface RouteParams {
  params: Promise<{
    supplyId: string;
  }>;
}

interface Review {
  id: string;
  supplyId: string;
  teamId: string;
  content: string;
  userName: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { supplyId } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const teamId = decodedToken.teamId as string;

    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    const reviewsSnapshot = await adminDb
      .collection("supplyReviews")
      .where("supplyId", "==", supplyId)
      .where("teamId", "==", teamId)
      .get();

    const reviews: Review[] = reviewsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Review[];

    reviews.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    return NextResponse.json({ reviews });
  } catch (_error) {
    return NextResponse.json(
      { error: "レビューの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { supplyId } = await params;
    const body = await request.json();
    const { content } = body;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const teamId = decodedToken.teamId as string;

    if (!teamId) {
      return NextResponse.json(
        { error: "チームIDが必要です" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "レビュー内容が必要です" },
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
    if (suppliesData?.teamId !== teamId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    let userName = "ユーザー";
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userName =
          userData?.displayName ||
          decodedToken.name ||
          decodedToken.email ||
          "ユーザー";
      } else {
        userName = decodedToken.name || decodedToken.email || "ユーザー";
      }
    } catch (error) {
      console.error("Failed to get user info:", error);
      userName = decodedToken.email || "ユーザー";
    }

    const reviewRef = await adminDb.collection("supplyReviews").add({
      supplyId,
      teamId,
      content,
      userName,
      userId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      reviewId: reviewRef.id,
      message: "レビューを投稿しました",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "レビューの投稿に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { supplyId: _supplyId } = await params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("reviewId");

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!reviewId) {
      return NextResponse.json(
        { error: "レビューIDが必要です" },
        { status: 400 }
      );
    }

    const reviewDoc = await adminDb
      .collection("supplyReviews")
      .doc(reviewId)
      .get();

    if (!reviewDoc.exists) {
      return NextResponse.json(
        { error: "レビューが見つかりません" },
        { status: 404 }
      );
    }

    const reviewData = reviewDoc.data();

    if (reviewData?.userId !== uid) {
      return NextResponse.json(
        { error: "削除権限がありません" },
        { status: 403 }
      );
    }

    await adminDb.collection("supplyReviews").doc(reviewId).delete();

    return NextResponse.json({
      success: true,
      message: "レビューを削除しました",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "レビューの削除に失敗しました" },
      { status: 500 }
    );
  }
}
