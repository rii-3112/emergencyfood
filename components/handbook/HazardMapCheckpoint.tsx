"use client";
import { useState } from "react";

export default function HazardMapCheckpoint() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrefecture, setSelectedPrefecture] = useState("");

  // 都道府県リスト（一部）
  const prefectures = [
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "秋田県",
    "山形県",
    "福島県",
    "茨城県",
    "栃木県",
    "群馬県",
    "埼玉県",
    "千葉県",
    "東京都",
    "神奈川県",
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
    "三重県",
    "滋賀県",
    "京都府",
    "大阪府",
    "兵庫県",
    "奈良県",
    "和歌山県",
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県",
  ];

  return (
    <div className='space-y-6'>
      <div className='bg-gray-300 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          チェックポイント2: ハザードマップ
        </h3>
        <p className='text-sm text-gray-700' />
        お住まいの地域のハザードマップを確認しましょう
      </div>

      {/* 検索機能 */}
      <div className='bg-white border rounded-lg p-6'>
        <h4 className='text-lg font-medium text-gray-900 mb-4'>
          地域を選択してください
        </h4>

        <div className='space-y-4'>
          {/* 都道府県選択 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              都道府県
            </label>
            <select
              value={selectedPrefecture}
              onChange={(e) => setSelectedPrefecture(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500'
            >
              <option value=''>都道府県を選択</option>
              {prefectures.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </div>

          {/* 市町村検索 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              市町村名で検索
            </label>
            <div className='flex gap-2'>
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='市町村名を入力'
                className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500'
              />
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    const searchQueryForGoogle = `${selectedPrefecture} ${searchQuery} 防災マップ`;
                    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQueryForGoogle)}`;
                    window.open(googleSearchUrl, "_blank");
                  }
                }}
                disabled={!searchQuery.trim()}
                className='px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
              >
                検索
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ハザードマップリンク集 */}
      <div className='bg-white border rounded-lg p-6'>
        <h4 className='text-lg font-medium text-gray-900 mb-4'>
          主要なハザードマップ
        </h4>

        <div className='space-y-3'>
          <div className='p-3 border rounded-lg hover:bg-gray-50'>
            <h5 className='font-medium text-gray-900'>
              国土交通省 ハザードマップポータルサイト
            </h5>
            <p className='text-sm text-gray-600 mb-2'>
              全国のハザードマップを一括検索できます
            </p>
            <a
              href='https://disaportal.gsi.go.jp/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline text-sm'
            >
              https://disaportal.gsi.go.jp/
            </a>
          </div>

          <div className='p-3 border rounded-lg hover:bg-gray-50'>
            <h5 className='font-medium text-gray-900'>気象庁 防災情報</h5>
            <p className='text-sm text-gray-600 mb-2'>
              気象警報・注意報、土砂災害警戒情報など
            </p>
            <a
              href='https://www.jma.go.jp/bosai/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline text-sm'
            >
              https://www.jma.go.jp/bosai/
            </a>
          </div>

          <div className='p-3 border rounded-lg hover:bg-gray-50'>
            <h5 className='font-medium text-gray-900'>
              内閣府 防災情報のページ
            </h5>
            <p className='text-sm text-gray-600 mb-2'>
              防災に関する総合的な情報
            </p>
            <a
              href='https://www.bousai.go.jp/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline text-sm'
            >
              https://www.bousai.go.jp/
            </a>
          </div>
        </div>
      </div>

      {/* 使い方ガイド */}
      <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
        <h4 className='text-lg font-medium text-gray-900 mb-2'>
          ハザードマップの使い方
        </h4>
        <div className='text-sm text-gray-800 space-y-2'>
          <p>
            1. <strong>浸水想定区域</strong>を確認して、自宅や職場の危険度を把握
          </p>
          <p>
            2. <strong>避難場所</strong>と<strong>避難経路</strong>を事前に確認
          </p>
          <p>
            3. <strong>土砂災害警戒区域</strong>がある場合は特に注意
          </p>
          <p>4. 定期的にハザードマップを確認し、最新情報をチェック</p>
        </div>
      </div>
    </div>
  );
}
