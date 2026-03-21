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
  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 isolate overflow-hidden bottom-tab-bar"
      style={{
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.08), color-mix(in srgb, var(--accent-primary) 16%, rgba(10,10,18,0.94)))',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.06), 0 -10px 28px rgba(0,0,0,0.28)',
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 pt-2">
        {tabs?.map((tab) => {
          const isActive =
            normalizedPathname === tab?.path || normalizedPathname.startsWith(`${tab.path}/`);
          const Icon = tab?.icon;
          return (
            <button
              key={tab?.path}
              onClick={() => router?.push(tab?.path)}
              className={`interactive-focus-ring mobile-touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-4 py-2 transition-all duration-200 ${
                isActive ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'
              }`}
              type="button"
              aria-label={tab?.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`relative rounded-xl p-2 transition-all duration-200 ${
                  isActive ? 'accent-chip border' : ''
                }`}
              >
                <Icon
                  size={22}
                  className={`transition-colors duration-200 ${
                    isActive ? 'accent-text' : 'text-gray-400'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-xl blur-sm"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                    }}
                  />
                )}
              </div>
              <span
                className={`text-[0.6875rem] font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? 'accent-text' : 'text-gray-500'
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
