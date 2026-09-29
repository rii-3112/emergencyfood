"use client";

import { ReactNode, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number; // 登録件数などを表示
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ items, defaultTab, className = "" }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id);

  const activeTabContent = items.find((item) => item.id === activeTab)?.content;

  return (
    <div className={`w-full ${className}`}>
      {/* タブヘッダー */}
      <div className='border-b border-[#F39800] mb-6'>
        <nav className='-mb-px flex space-x-8' aria-label='Tabs'>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === item.id
                    ? "border-[#F39800] text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-[#F39800]"
                }
              `}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              {item.label}
              {item.badge && (
                <span
                  className={`
                    ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      activeTab === item.id
                        ? "bg-white text-gray-800"
                        : "bg-white text-gray-800"
                    }
                  `}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className='tab-content'>{activeTabContent}</div>
    </div>
  );
}
