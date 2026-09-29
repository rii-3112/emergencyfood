"use client";
import DisasterBoardCheckpoint, {
  type PlanSection,
} from "@/components/handbook/DisasterBoardCheckpoint";
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

export type HandbookCheckpoint = "supplies" | "hazardmap" | "plans";

interface HandbookClientProps {
  initialDisasterBoardData: DisasterBoardData | null;
  initialTeamData: Team | null;
  initialChecklistData: {
    checkedItemIds: string[];
    checkedPetItems: { [petType: string]: string[] };
  } | null;
  user: ServerUser;
  initialCheckpoint?: HandbookCheckpoint;
  initialPlanSection?: PlanSection;
  openPlanAdd?: boolean;
}

export default function HandbookClient({
  initialDisasterBoardData,
  initialTeamData,
  initialChecklistData,
  user,
  initialCheckpoint = "supplies",
  initialPlanSection,
  openPlanAdd = false,
}: HandbookClientProps) {
  const [activeCheckpoint, setActiveCheckpoint] =
    useState<HandbookCheckpoint>(initialCheckpoint);

  const checkpoints = [
    { id: "supplies" as const, label: "備蓄品チェック" },
    { id: "hazardmap" as const, label: "ハザードマップ" },
    { id: "plans" as const, label: "事前に決めておくこと" },
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
      case "plans":
        return (
          <DisasterBoardCheckpoint
            initialData={initialDisasterBoardData}
            initialSection={initialPlanSection}
            initialTeamData={initialTeamData}
            openAdd={openPlanAdd}
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
                ? "bg-[#F39800] text-black"
                : "bg-white text-black border border-[#F39800] hover:bg-[#FFF6E4]"
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
