'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Settings } from 'lucide-react';

const tabs = [
  { label: 'Sessions', icon: MessageSquare, path: '/sessions-list' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bottom-tab-bar"
      style={{
        background: 'rgba(8, 8, 15, 0.92)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 pt-2">
        {tabs?.map((tab) => {
          const isActive = pathname === tab?.path;
          const Icon = tab?.icon;
          return (
            <button
              key={tab?.path}
              onClick={() => router?.push(tab?.path)}
              className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'scale-100' : 'opacity-50 scale-95'
              }`}
              aria-label={tab?.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-purple-500/20' : ''
                }`}
              >
                <Icon
                  size={22}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-purple-400' : 'text-gray-400'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-purple-500/10 blur-sm" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-purple-400' : 'text-gray-500'
                }`}
              >
                {tab?.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
