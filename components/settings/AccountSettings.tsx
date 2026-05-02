"use client";
import { useAuth } from "@/hooks";
import type { AppUser } from "@/types";
import {
  ERROR_MESSAGES,
  PROFILE_GENDER_OPTIONS,
  SUCCESS_MESSAGES,
  UI_CONSTANTS,
} from "@/utils/constants";
import { useEffect, useState } from "react";

function normalizeStoredGender(g?: string): string {
  if (!g) return "";
  if (g === "other") return "prefer_not_to_say";
  return g;
}

interface AccountSettingsProps {
  user: AppUser & { gender?: string };
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const { updateUserName, changePassword, user: authUser } = useAuth();

  const getDisplayName = () => {
    return user.displayName || user.email;
  };

  const getEditDisplayName = () => {
    return user.displayName || "";
  };

  const [displayName, setDisplayName] = useState(getEditDisplayName());
  const [gender, setGender] = useState(() =>
    normalizeStoredGender(user.gender)
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setGender(normalizeStoredGender(user.gender));
  }, [user.gender]);
  //名前保存
  const handleNameSave = async () => {
    if (!displayName.trim()) {
      setMessage({ type: "error", text: "名前を入力してください" });
      return;
    }

    setLoading(true);
    try {
      await updateUserName(displayName.trim());
      setIsEditingName(false);
      setMessage({ type: "success", text: SUCCESS_MESSAGES.NAME_UPDATED });
    } catch (_error) {
      setMessage({ type: "error", text: ERROR_MESSAGES.NAME_UPDATE_FAILED });
    } finally {
      setLoading(false);
    }
  };

  const handleGenderSave = async () => {
    if (!gender) {
      setMessage({ type: "error", text: "性別を選択してください" });
      return;
    }

    const nameForApi =
      authUser?.displayName?.trim() ||
      displayName.trim() ||
      user.displayName?.trim() ||
      "";

    if (!nameForApi) {
      setMessage({
        type: "error",
        text: "先にアカウント名を設定してください",
      });
      return;
    }

    if (!authUser) {
      setMessage({ type: "error", text: ERROR_MESSAGES.UNAUTHORIZED });
      return;
    }

    setLoading(true);
    try {
      await updateUserName(nameForApi, gender);
      setMessage({ type: "success", text: SUCCESS_MESSAGES.PROFILE_UPDATED });
    } catch (_error) {
      setMessage({ type: "error", text: ERROR_MESSAGES.NAME_UPDATE_FAILED });
    } finally {
      setLoading(false);
    }
  };

  //パスワード変更
  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "パスワードは6文字以上にしてください",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "パスワードが一致しません" });
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
      setIsChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: SUCCESS_MESSAGES.PASSWORD_CHANGED });
    } catch (_error) {
      setMessage({
        type: "error",
        text: ERROR_MESSAGES.PASSWORD_CHANGE_FAILED,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <h2 className='text-xl font-semibold text-gray-900 mb-4'>
        {UI_CONSTANTS.ACCOUNT_SETTINGS}
      </h2>
      {message && (
        <div
          className={`p-3 rounded-md ${
            message.type === "success"
              ? "bg-green-200 text-black border"
              : "bg-red-200 text-black border"
          }`}
        >
          {message.text}
        </div>
      )}
      {/* アカウント名 */}
      <div className='space-y-2'>
        <label className='block text-sm font-medium text-gray-900'>
          {UI_CONSTANTS.ACCOUNT_NAME}
        </label>
        {isEditingName ? (
          <div className='flex gap-2'>
            <input
              className='flex-1 px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black'
              placeholder='アカウント名を入力'
              type='text'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <button
              className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors'
              disabled={loading}
              onClick={handleNameSave}
            >
              {loading ? UI_CONSTANTS.PROCESSING : UI_CONSTANTS.SAVE}
            </button>
            <button
              className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors'
              onClick={() => {
                setIsEditingName(false);
                setDisplayName(getEditDisplayName());
              }}
            >
              {UI_CONSTANTS.CANCEL}
            </button>
          </div>
        ) : (
          <div className='flex items-center justify-between p-3 bg-gray-100 rounded-md border border-gray-300'>
            <span className='text-gray-900'>{getDisplayName()}</span>
            <button
              className='text-black hover:text-gray-600 text-sm font-medium transition-colors'
              onClick={() => setIsEditingName(true)}
            >
              {UI_CONSTANTS.EDIT}
            </button>
          </div>
        )}
        {/* メールアドレス */}
      </div>
      <div className='space-y-2'>
        <label className='block text-sm font-medium text-gray-900'>
          {UI_CONSTANTS.EMAIL_ADDRESS}
        </label>
        <div className='p-3 bg-gray-100 rounded-md border border-gray-300'>
          <span className='text-gray-900'>{user.email}</span>
        </div>
      </div>
      <div className='space-y-2'>
        <label
          className='block text-sm font-medium text-gray-900'
          htmlFor='settings-gender'
        >
          性別（必要な備蓄品を推奨するため）
        </label>
        <p className='text-xs text-gray-600 leading-relaxed'>
          ハンドブックの備蓄リストで、あなたに適した備蓄品を推奨する初期状態のために使います。あとからでもここから変更できます。
        </p>
        <div className='flex flex-col sm:flex-row gap-2'>
          <select
            disabled={loading}
            className='flex-1 px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white disabled:opacity-50'
            id='settings-gender'
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value=''>選択してください</option>
            {PROFILE_GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0'
            disabled={loading}
            type='button'
            onClick={handleGenderSave}
          >
            {loading ? UI_CONSTANTS.PROCESSING : UI_CONSTANTS.SAVE}
          </button>
        </div>
      </div>
      <div className='space-y-2'>
        <label className='block text-sm font-medium text-gray-900'>
          パスワード変更
        </label>
        {isChangingPassword ? (
          <div className='space-y-3'>
            <input
              className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black'
              placeholder='新しいパスワード（6文字以上）'
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              className='w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black'
              placeholder='新しいパスワード（確認）'
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className='flex gap-2'>
              <button
                className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors'
                disabled={loading}
                onClick={handlePasswordChange}
              >
                {loading ? UI_CONSTANTS.PROCESSING : UI_CONSTANTS.SAVE}
              </button>
              <button
                className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors'
                onClick={() => {
                  setIsChangingPassword(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                {UI_CONSTANTS.CANCEL}
              </button>
            </div>
          </div>
        ) : (
          <button
            className='px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors'
            onClick={() => setIsChangingPassword(true)}
          >
            {UI_CONSTANTS.CHANGE_PASSWORD}
          </button>
        )}
      </div>
    </div>
  );
}
