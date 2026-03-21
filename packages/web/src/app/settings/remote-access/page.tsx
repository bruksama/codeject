'use client';

import { RemoteAccessSettingsPanel } from '@/components/settings/remote-access-settings-panel';
import { SettingsScreenHeader } from '@/components/settings/settings-screen-header';
import BottomTabBar from '@/components/ui/BottomTabBar';

export default function RemoteAccessSettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#08080f]">
      <SettingsScreenHeader
        subtitle="Manage tunnel mode, public URL, QR sharing, and per-device bearer auth."
        title="Remote Access"
      />
      <main
        className="flex-1 overflow-y-auto px-4 py-5"
        id="main-content"
        tabIndex={-1}
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      >
        <RemoteAccessSettingsPanel />
      </main>
      <BottomTabBar />
    </div>
  );
}
