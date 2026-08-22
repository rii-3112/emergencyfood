import { NextResponse, type NextRequest } from "next/server";

import {
  createSupplyReview,
  listSupplyReviews,
  removeSupplyReview,
} from "@/lib/services/supply";
import { isTeamServiceError } from "@/lib/services/team-errors";
import { requireApiUser } from "@/utils/auth/server";
import { adminDb } from "@/utils/firebase/admin";

interface RouteParams {
  params: Promise<{
    supplyId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { supplyId } = await params;
    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listSupplyReviews({
      uid: user.uid,
      supplyId,
      teamId: user.teamId ?? "",
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
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

    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userName = "ユーザー";
    try {
      const userDoc = await adminDb.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userName =
          userData?.displayName || user.displayName || user.email || "ユーザー";
      } else {
        userName = user.displayName || user.email || "ユーザー";
      }
    } catch (error) {
      console.error("Failed to get user info:", error);
      userName = user.email || "ユーザー";
    }

    const result = await createSupplyReview({
      uid: user.uid,
      supplyId,
      teamId: user.teamId ?? "",
      content,
      userName,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "レビューの投稿に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("reviewId") ?? "";

    const user = await requireApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await removeSupplyReview({
      uid: user.uid,
      reviewId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isTeamServiceError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "レビューの削除に失敗しました" },
      { status: 500 }
    );
  }
}
