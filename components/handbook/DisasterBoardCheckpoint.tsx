"use client";
import {
  Button,
  Card,
  ErrorMessage,
  SuccessMessage,
  TabItem,
  Tabs,
} from "@/components/ui";
import { useAuth } from "@/hooks";
import type { DisasterBoardData, Team } from "@/types";
import { useState } from "react";
import { BasicInfoTab } from "./disaster-board/BasicInfoTab";
import { CommunicationTab } from "./disaster-board/CommunicationTab";
import { EvacuationTab } from "./disaster-board/EvacuationTab";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
}

interface DisasterBoardCheckpointProps {
  initialData: DisasterBoardData | null;
  initialTeamData: Team | null;
  user: ServerUser;
}

const defaultData: DisasterBoardData = {
  evacuationSites: [],
  evacuationRoutes: [],
  safetyMethods: [],
  familyAgreements: [],
  useDisasterDial: true,
};

export default function DisasterBoardCheckpoint({
  initialData,
  initialTeamData,
  user: _serverUser,
}: DisasterBoardCheckpointProps) {
  const { user: sessionUser } = useAuth();
  const [data, setData] = useState<DisasterBoardData>(
    initialData || defaultData
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    if (!sessionUser || !initialTeamData) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/disaster-board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: initialTeamData.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }

      setSuccess("災害用伝言板の情報を保存しました");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!initialTeamData) {
    return (
      <div className='bg-gray-50 p-4 text-gray-800 rounded-md'>
        <p className='font-medium'>チームへの参加が必要です</p>
        <p className='text-sm mt-2'>
          災害用伝言板を使用するにはチームに参加する必要があります。
        </p>
      </div>
    );
  }

  const tabItems: TabItem[] = [
    {
      id: "evacuation",
      label: "避難関連",
      content: (
        <EvacuationTab
          sites={data.evacuationSites}
          routes={data.evacuationRoutes}
          onSitesUpdate={(sites) =>
            setData((prev) => ({ ...prev, evacuationSites: sites }))
          }
          onRoutesUpdate={(routes) =>
            setData((prev) => ({ ...prev, evacuationRoutes: routes }))
          }
        />
      ),
    },
    {
      id: "communication",
      label: "連絡・約束",
      content: (
        <CommunicationTab
          methods={data.safetyMethods}
          agreements={data.familyAgreements}
          onMethodsUpdate={(methods) =>
            setData((prev) => ({ ...prev, safetyMethods: methods }))
          }
          onAgreementsUpdate={(agreements) =>
            setData((prev) => ({ ...prev, familyAgreements: agreements }))
          }
        />
      ),
    },
    {
      id: "basic-info",
      label: "基本情報",
      content: (
        <BasicInfoTab
          useDisasterDial={data.useDisasterDial}
          onToggleUse={(use) =>
            setData((prev) => ({ ...prev, useDisasterDial: use }))
          }
        />
      ),
    },
  ];

  return (
    <div className='space-y-6'>
      <div className='bg-gray-300 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          チェックポイント3: 災害用伝言板
        </h3>
        <p className='text-sm text-gray-700'>
          家族で事前に共有すべき情報を管理しましょう
        </p>
      </div>

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <div className='flex justify-end'>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          {saving ? "保存中..." : "変更を保存"}
        </Button>
      </div>

      <Tabs items={tabItems} defaultTab='evacuation' />

      {data.lastUpdated && (
        <Card>
          <div className='text-center text-sm text-gray-500'>
            最終更新:{" "}
            {(() => {
              try {
                const date =
                  typeof data.lastUpdated === "string"
                    ? new Date(data.lastUpdated)
                    : data.lastUpdated;
                return date instanceof Date && !isNaN(date.getTime())
                  ? date.toLocaleString("ja-JP")
                  : "不明";
              } catch {
                return "不明";
              }
            })()}
            {data.lastUpdatedBy && (
              <span className='ml-2'>| 更新者: {data.lastUpdatedBy}</span>
            )}
          </div>
        </Card>
      )}

      <div className='flex justify-center pb-8'>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={saving}
          size='lg'
        >
          {saving ? "保存中..." : "変更を保存"}
        </Button>
      </div>

      {/* 使い方ガイド */}
      <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
        <h4 className='text-lg font-medium text-gray-900 mb-2'>
          災害用伝言板の使い方
        </h4>
        <div className='text-sm text-gray-800 space-y-2'>
          <p>
            <strong>避難関連</strong>: 避難場所と避難経路を事前に決めておく
          </p>
          <p>
            <strong>連絡・約束</strong>: 安否確認方法と家族の約束事を決める
          </p>
          <p>
            <strong>基本情報</strong>: 災害用伝言ダイヤルの利用設定
          </p>
        </div>
      </div>

      {/* 注意事項 */}
      <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
        <h4 className='text-lg font-medium text-gray-900 mb-2'>注意事項</h4>
        <div className='text-sm text-gray-800 space-y-2'>
          <p>• 災害時に備えて、定期的に情報を更新してください</p>
          <p>• 家族全員で情報を共有し、定期的に確認してください</p>
          <p>• 避難場所や連絡方法は実際に確認しておきましょう</p>
        </div>
      </div>
    </div>
  );
}
