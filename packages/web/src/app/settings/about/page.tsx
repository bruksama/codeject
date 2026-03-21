'use client';

import { AboutSettingsPanel } from '@/components/settings/about-settings-panel';
import { SettingsScreenHeader } from '@/components/settings/settings-screen-header';
import BottomTabBar from '@/components/ui/BottomTabBar';

export default function AboutSettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#08080f]">
      <SettingsScreenHeader
        subtitle="Version details, repository link, and basic legal surfaces."
        title="About"
      />
      <main
        className="flex-1 overflow-y-auto px-4 py-5"
        id="main-content"
        tabIndex={-1}
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      >
        <AboutSettingsPanel />
      </main>
      <BottomTabBar />
    </div>
  );
}
