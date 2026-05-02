"use client";
import DisasterBoardCheckpoint from "@/components/handbook/DisasterBoardCheckpoint";
import HazardMapCheckpoint from "@/components/handbook/HazardMapCheckpoint";
import SuppliesChecklist from "@/components/handbook/disaster-board/SuppliesChecklist";
import type { DisasterBoardData, Team } from "@/types";
import { useState } from "react";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
}

interface HandbookClientProps {
  initialDisasterBoardData: DisasterBoardData | null;
  initialTeamData: Team | null;
  initialChecklistData: {
    checkedItemIds: string[];
    checkedPetItems: { [petType: string]: string[] };
  } | null;
  user: ServerUser;
}

export default function HandbookClient({
  initialDisasterBoardData,
  initialTeamData,
  initialChecklistData,
  user,
}: HandbookClientProps) {
  const [activeCheckpoint, setActiveCheckpoint] = useState<
    "supplies" | "hazardmap" | "disasterboard"
  >("supplies");

  const checkpoints = [
    { id: "supplies" as const, label: "備蓄品チェック" },
    { id: "hazardmap" as const, label: "ハザードマップ" },
    { id: "disasterboard" as const, label: "災害用伝言板" },
  ];

  const renderCheckpoint = () => {
    switch (activeCheckpoint) {
      case "supplies":
        return (
          <SuppliesChecklist
            key={initialTeamData?.id ?? "no-team"}
            initialTeamData={initialTeamData}
            initialChecklistData={initialChecklistData}
          />
        );
      case "hazardmap":
        return <HazardMapCheckpoint />;
      case "disasterboard":
        return (
          <DisasterBoardCheckpoint
            initialData={initialDisasterBoardData}
            initialTeamData={initialTeamData}
            user={user}
          />
        );
      default:
        return (
          <SuppliesChecklist
            key={initialTeamData?.id ?? "no-team"}
            initialTeamData={initialTeamData}
            initialChecklistData={initialChecklistData}
          />
        );
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap gap-2 justify-center'>
        {checkpoints.map((checkpoint) => (
          <button
            key={checkpoint.id}
            onClick={() => setActiveCheckpoint(checkpoint.id)}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
              activeCheckpoint === checkpoint.id
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {checkpoint.label}
          </button>
        ))}
      </div>

      {renderCheckpoint()}
    </div>
  );
}
