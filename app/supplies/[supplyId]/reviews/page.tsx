import { getServerUser } from "@/utils/auth/server";
import { fetchSupplyByIdFromDB } from "@/utils/data/server";
import { notFound, redirect } from "next/navigation";

import ReviewsClient from "./ReviewsClient";

export const dynamic = "force-dynamic";

interface SupplyReviewsPageProps {
  params: Promise<{
    supplyId: string;
  }>;
}

export default async function SupplyReviewsPage({
  params,
}: SupplyReviewsPageProps) {
  const { supplyId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!user.teamId) {
    redirect("/settings?tab=team");
  }
  const supply = await fetchSupplyByIdFromDB(user.teamId, supplyId);
  if (!supply) {
    notFound();
  }

  return (
    <div>
      <div className='container mx-auto py-8 min-h-screen'>
        <header className='mb-8 border-gray-300 border-b pb-4'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>感想を共有</h1>
          <p className='text-gray-600'>共有して次回に備える。</p>
        </header>
        <ReviewsClient
          supplyId={supplyId}
          user={user}
          supplyName={supply.name}
        />
      </div>
    </div>
  );
}
