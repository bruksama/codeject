'use client';

import { useEffect, useEffectEvent } from 'react';
import { notificationService } from '@/lib/notification-service';
import { useAppStore } from '@/stores/useAppStore';

export default function NotificationPermissionSync() {
  const notificationsEnabled = useAppStore((state) => state.settings.notifications);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const syncPreference = useEffectEvent(() => {
    const permission = notificationService.syncPermission();
    if (notificationsEnabled && permission !== 'granted') {
      updateSettings({ notifications: false });
    }
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPreference();
      }
    };

    syncPreference();
    window.addEventListener('focus', syncPreference);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncPreference);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
