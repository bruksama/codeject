'use client';

import { useAppStore } from '@/stores/useAppStore';

type CodejectNotificationOptions = {
  body: string;
  sessionId?: string;
  tag?: string;
};

class NotificationService {
  private permissionState: NotificationPermission = 'default';

  get isSupported() {
    return typeof window !== 'undefined' && typeof Notification !== 'undefined';
  }

  get permission() {
    return this.isSupported ? Notification.permission : this.permissionState;
  }

  async requestPermission() {
    if (!this.isSupported) {
      this.permissionState = 'denied';
      return this.permissionState;
    }

    this.permissionState = await Notification.requestPermission();
    return this.permissionState;
  }

  syncPermission() {
    this.permissionState = this.isSupported ? Notification.permission : 'denied';
    return this.permissionState;
  }

  notify(title: string, options: CodejectNotificationOptions) {
    if (!this.isSupported) {
      return null;
    }

    this.syncPermission();
    if (this.permissionState !== 'granted' || document.hasFocus()) {
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: '/favicon.ico',
        tag: options.tag ?? 'codeject',
      });

      notification.addEventListener('click', () => {
        try {
          window.focus();
        } catch {
          // Browsers can block focus changes from background tabs.
        }

        if (options.sessionId) {
          useAppStore.getState().setActiveSession(options.sessionId);
          if (window.location.pathname !== '/chat-interface') {
            window.location.assign('/chat-interface');
          }
        }

        notification.close();
      });

      return notification;
    } catch (error) {
      console.warn('Failed to show browser notification', error);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
