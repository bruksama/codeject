'use client';

import { AppearanceSettingsPanel } from '@/components/settings/appearance-settings-panel';
import { SettingsScreenHeader } from '@/components/settings/settings-screen-header';
import BottomTabBar from '@/components/ui/BottomTabBar';

export default function AppearanceSettingsPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#08080f]">
      <SettingsScreenHeader
        subtitle="Tune the app reading scale and accent for this browser."
        title="Appearance"
      />
      <main
        className="flex-1 overflow-y-auto px-4 py-5"
        id="main-content"
        tabIndex={-1}
        style={{
          paddingBottom:
            'calc(var(--app-bottom-nav-clearance, 96px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <AppearanceSettingsPanel />
      </main>
      <BottomTabBar />
    </div>
  );
}
