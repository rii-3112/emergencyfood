"use client";
import SupplyForm from "@/components/supplies/SupplyForm";
import { useRouter } from "next/navigation";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
}

interface SupplyAddFormProps {
  user: ServerUser;
}

export default function SupplyAddForm({ user }: SupplyAddFormProps) {
  const router = useRouter();

  return (
    <SupplyForm
      teamId={user.teamId!}
      uid={user.uid}
      onCancel={() => router.push("/supplies/list")}
    />
  );
}
