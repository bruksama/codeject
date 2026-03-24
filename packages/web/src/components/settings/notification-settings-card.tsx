'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { notificationService } from '@/lib/notification-service';
import { useAppStore } from '@/stores/useAppStore';
import { selectSettings, selectUpdateSettings } from '@/stores/use-app-store-selectors';

export function NotificationSettingsCard() {
  const settings = useAppStore(selectSettings);
  const updateSettings = useAppStore(selectUpdateSettings);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    notificationService.syncPermission()
  );

  useEffect(() => {
    const syncPermission = () => {
      setPermission(notificationService.syncPermission());
    };

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  const isSupported = notificationService.isSupported;
  const helperText = !isSupported
    ? 'This browser does not expose notifications here. On iPhone Safari, install Codeject to the Home Screen first.'
    : permission === 'denied'
      ? 'Blocked in browser settings. Re-enable there before turning this back on.'
      : 'Chrome works over tunnels. iPhone Safari still needs Add to Home Screen first.';

  const handleToggle = async () => {
    if (!isSupported) {
      toast.error('Notifications are unavailable in this browser');
      return;
    }

    if (settings.notifications) {
      updateSettings({ notifications: false });
      toast.success('Notifications turned off');
      return;
    }

    const nextPermission =
      notificationService.syncPermission() === 'granted'
        ? notificationService.permission
        : await notificationService.requestPermission();
    setPermission(nextPermission);

    if (nextPermission === 'granted') {
      updateSettings({ notifications: true });
      toast.success('Notifications enabled');
      return;
    }

    updateSettings({ notifications: false });
    if (nextPermission === 'denied') {
      toast.error('Notifications blocked. Enable them in browser settings.');
      return;
    }

    toast.message('Notifications stay off until permission is granted.');
  };

  return (
    <button
      aria-pressed={settings.notifications}
      className={`interactive-focus-ring w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
        settings.notifications
          ? 'border-white/15 bg-white/10 text-white'
          : 'border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
      } ${!isSupported ? 'opacity-70' : ''}`}
      onClick={() => void handleToggle()}
      type="button"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          {settings.notifications ? (
            <Bell className="accent-text" size={18} />
          ) : (
            <BellOff className="text-white/55" size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {settings.notifications ? <Check className="accent-text" size={16} /> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-white/55">
            Get notified when the agent needs approval, fails, or finishes a reply.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/42">{helperText}</p>
        </div>
      </div>
    </button>
  );
}
