"use client";
import AccountSettings from "@/components/settings/AccountSettings";
import LineAccountLinker from "@/components/settings/LineAccountLinker";
import LogoutSection from "@/components/settings/LogoutSection";
import TeamSettings from "@/components/settings/TeamSettings";
import { UI_CONSTANTS } from "@/utils/constants";
import { useState } from "react";

import type { Team } from "@/types";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
  gender?: string;
}

interface SettingsClientProps {
  user: ServerUser;
  initialTeam?: Team | null;
}

type SettingsTab = "line" | "account" | "team" | "logout";

export default function SettingsClient({
  user,
  initialTeam,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("line");

  const tabs = [
    {
      id: "line" as SettingsTab,
      label: UI_CONSTANTS.LINE_NOTIFICATION_SETTINGS,
    },
    { id: "account" as SettingsTab, label: UI_CONSTANTS.ACCOUNT_SETTINGS },
    { id: "team" as SettingsTab, label: UI_CONSTANTS.FAMILY_GROUP_SETTINGS },
    { id: "logout" as SettingsTab, label: UI_CONSTANTS.LOGOUT },
  ];

  const renderTabContent = () => {
    const appUser = {
      ...user,
      getIdToken: async () => {
        throw new Error("getIdToken not available in server context");
      },
      getIdTokenResult: async () => {
        throw new Error("getIdTokenResult not available in server context");
      },
    };

    switch (activeTab) {
      case "line":
        return <LineAccountLinker currentUser={appUser} />;
      case "account":
        return <AccountSettings user={appUser} />;
      case "team":
        return <TeamSettings user={appUser} initialTeam={initialTeam} />;
      case "logout":
        return <LogoutSection />;
      default:
        return <LineAccountLinker currentUser={appUser} />;
    }
  };

  return (
    <div className='max-w-4xl mx-auto'>
      <div className='flex flex-wrap gap-2 mb-8'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-black text-white border-b-2 border-black"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className='bg-white rounded-lg shadow-md border border-gray-300 p-6'>
        {renderTabContent()}
      </div>
    </div>
  );
}
