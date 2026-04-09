"use client";
import { DisasterDialInfo } from "./DisasterDialInfo";
//コンポーネントの形状を定義するためのインターフェース
interface BasicInfoTabProps {
  useDisasterDial: boolean;
  onToggleUse: (use: boolean) => void;
}

export function BasicInfoTab({
  useDisasterDial,
  onToggleUse,
}: BasicInfoTabProps) {
  return (
    <div className='space-y-8'>
      <DisasterDialInfo
        useDisasterDial={useDisasterDial}
        onToggleUse={onToggleUse}
      />
    </div>
  );
}
