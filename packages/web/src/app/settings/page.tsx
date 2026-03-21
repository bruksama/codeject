'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Palette, Plus, RotateCcw, Trash2, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsConfirmModal } from '@/components/settings/settings-confirm-modal';
import AppLogo from '@/components/ui/AppLogo';
import BottomTabBar from '@/components/ui/BottomTabBar';
import ProgramIcon from '@/components/ui/program-icon';
import SettingsGroup from '@/components/ui/SettingsGroup';
import SettingsItem from '@/components/ui/SettingsItem';
import { useSessionApi } from '@/hooks/use-session-api';
import { clearStoredApiKey } from '@/lib/api-client';
import { useAppStore } from '@/stores/useAppStore';
import {
  selectClearSessions,
  selectCliPrograms,
  selectRemoteAccessSettings,
  selectResetSettings,
  selectSessions,
  selectSettings,
} from '@/stores/use-app-store-selectors';

const APP_VERSION = '1.1.0';
const FONT_SIZE_LABELS = { large: 'Large', medium: 'Medium', small: 'Small' } as const;

export default function SettingsPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const cliPrograms = useAppStore(selectCliPrograms);
  const sessions = useAppStore(selectSessions);
  const settings = useAppStore(selectSettings);
  const remoteAccess = useAppStore(selectRemoteAccessSettings);
  const clearSessions = useAppStore(selectClearSessions);
  const resetSettings = useAppStore(selectResetSettings);
  const [confirmAction, setConfirmAction] = useState<'clear-sessions' | 'reset-settings' | null>(
    null
  );

  useEffect(() => {
    if (cliPrograms.length > 0) {
      return;
    }
    void sessionApi.loadCliPrograms().catch(() => undefined);
  }, [cliPrograms.length, sessionApi]);

  return (
    <div
      className="flex min-h-dvh flex-col bg-[#08080f]"
      style={{ paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      <header className="px-4 pb-4 pt-3">
        <div className="flex items-center gap-3">
          <AppLogo size={34} />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white/92">Settings</h1>
            <p className="text-sm leading-6 text-white/45">
              Codeject v{APP_VERSION}. Shortcuts for the screens you revisit most.
            </p>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1 overflow-y-auto px-4"
        tabIndex={-1}
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      >
        <SettingsGroup title="Preferences">
          <SettingsItem
            icon={<Palette className="accent-text" size={18} />}
            label="Appearance"
            onClick={() => router.push('/settings/appearance')}
            showDivider
            sublabel="Accent color and readable type scale"
            type="value"
            value={FONT_SIZE_LABELS[settings.fontSize]}
          />
          <SettingsItem
            icon={<Wifi className="accent-text" size={18} />}
            label="Remote Access"
            onClick={() => router.push('/settings/remote-access')}
            showDivider
            sublabel={
              remoteAccess.enabled
                ? 'Tunnel mode, public URL, and device auth'
                : 'Rotate and save a device key to inspect the tunnel'
            }
            type="value"
            value={remoteAccess.tunnelStatus}
          />
          <SettingsItem
            icon={<Info className="accent-text" size={18} />}
            label="About"
            onClick={() => router.push('/settings/about')}
            showDivider={false}
            sublabel="Version, repository, and legal links"
            type="value"
            value={`v${APP_VERSION}`}
          />
        </SettingsGroup>

        <SettingsGroup title="CLI Programs">
          {cliPrograms.map((program, index) => (
            <SettingsItem
              key={program.id}
              icon={<ProgramIcon alt={program.name} icon={program.icon} size={18} />}
              label={program.name}
              onClick={() => router.push(`/cli-program-editor?id=${program.id}`)}
              showDivider={index < cliPrograms.length - 1}
              sublabel={program.command}
              type="disclosure"
            />
          ))}
          <SettingsItem
            icon={<Plus className="accent-text" size={18} />}
            label="Add CLI Program"
            onClick={() => router.push('/cli-program-editor')}
            showDivider={false}
            sublabel="Create another saved program preset"
            type="disclosure"
          />
        </SettingsGroup>

        <SettingsGroup title="Danger Zone">
          <SettingsItem
            icon={<Trash2 className="text-red-300" size={18} />}
            label="Clear All Sessions"
            onClick={() => setConfirmAction('clear-sessions')}
            showDivider
            sublabel={`${sessions.length} saved session${sessions.length === 1 ? '' : 's'}`}
            type="destructive"
          />
          <SettingsItem
            icon={<RotateCcw className="text-red-300" size={18} />}
            label="Reset Local Settings"
            onClick={() => setConfirmAction('reset-settings')}
            showDivider={false}
            sublabel="Resets appearance and cached device-auth state in this browser"
            type="destructive"
          />
        </SettingsGroup>
      </main>

      <BottomTabBar />

      {confirmAction === 'clear-sessions' ? (
        <SettingsConfirmModal
          confirmLabel="Delete All"
          destructive
          message="This permanently deletes all saved sessions and chat history from the app."
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            void Promise.all(sessions.map((session) => sessionApi.deleteSession(session.id)))
              .then(() => {
                clearSessions();
                setConfirmAction(null);
                toast.success('All sessions cleared');
              })
              .catch((error) => {
                toast.error(error instanceof Error ? error.message : 'Failed to clear sessions');
              });
          }}
          title="Clear All Sessions"
        />
      ) : null}

      {confirmAction === 'reset-settings' ? (
        <SettingsConfirmModal
          confirmLabel="Reset"
          destructive
          message="This resets browser-local appearance preferences and the saved device bearer key."
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            clearStoredApiKey();
            resetSettings();
            setConfirmAction(null);
            toast.success('Settings reset to defaults');
          }}
          title="Reset Local Settings"
        />
      ) : null}
    </div>
  );
}
