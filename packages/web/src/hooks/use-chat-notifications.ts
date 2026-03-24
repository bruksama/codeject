'use client';

import { useRef } from 'react';
import type { ConnectionStatus, ServerWebSocketMessage } from '@codeject/shared';
import { notificationService } from '@/lib/notification-service';
import { useAppStore } from '@/stores/useAppStore';

function truncateNotificationBody(content: string, maxLength = 100) {
  return content.length > maxLength ? `${content.slice(0, maxLength - 3)}...` : content;
}

export function useChatNotifications(sessionId: string | undefined) {
  const notificationsEnabled = useAppStore((state) => Boolean(state.settings.notifications));
  const lastActionRequestIdRef = useRef<string | null>(null);
  const lastReplyMessageIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<ConnectionStatus | null>(null);

  const handleMessage = (message: ServerWebSocketMessage) => {
    if (message.type === 'chat:bootstrap') {
      const actionRequest = message.chatState?.actionRequest;
      if (!notificationsEnabled || !sessionId || !actionRequest) {
        lastActionRequestIdRef.current = actionRequest?.id ?? null;
        return;
      }

      if (lastActionRequestIdRef.current === actionRequest.id) {
        return;
      }

      lastActionRequestIdRef.current = actionRequest.id;
      notificationService.notify('Action needed', {
        body: truncateNotificationBody(actionRequest.prompt),
        sessionId,
        tag: `action-${sessionId}`,
      });
      return;
    }

    if (message.type === 'terminal:ready') {
      previousStatusRef.current = message.status;
      return;
    }

    if (message.type === 'terminal:status') {
      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = message.status;

      if (
        notificationsEnabled &&
        sessionId &&
        message.status === 'idle' &&
        (previousStatus === 'connected' || previousStatus === 'starting')
      ) {
        notificationService.notify('Session finished', {
          body: 'Your AI agent is idle',
          sessionId,
          tag: `idle-${sessionId}`,
        });
      }
      return;
    }

    if (!notificationsEnabled || !sessionId) {
      return;
    }

    switch (message.type) {
      case 'surface:update': {
        const actionRequest = message.chatState?.actionRequest;
        if (!actionRequest) {
          lastActionRequestIdRef.current = null;
          return;
        }

        if (lastActionRequestIdRef.current === actionRequest.id) {
          return;
        }

        lastActionRequestIdRef.current = actionRequest.id;
        notificationService.notify('Action needed', {
          body: truncateNotificationBody(actionRequest.prompt),
          sessionId,
          tag: `action-${sessionId}`,
        });
        return;
      }
      case 'chat:message':
        if (message.message.role !== 'assistant' || message.message.isStreaming) {
          return;
        }

        if (lastReplyMessageIdRef.current === message.message.id) {
          return;
        }

        lastReplyMessageIdRef.current = message.message.id;
        notificationService.notify('Reply ready', {
          body: truncateNotificationBody(message.message.content),
          sessionId,
          tag: `reply-${sessionId}`,
        });
        return;
      case 'chat:update':
        if (message.isStreaming || !message.content.trim()) {
          return;
        }

        if (lastReplyMessageIdRef.current === message.messageId) {
          return;
        }

        lastReplyMessageIdRef.current = message.messageId;
        notificationService.notify('Reply ready', {
          body: truncateNotificationBody(message.content),
          sessionId,
          tag: `reply-${sessionId}`,
        });
        return;
      case 'terminal:error':
        notificationService.notify('Session error', {
          body: truncateNotificationBody(message.message),
          sessionId,
          tag: `error-${sessionId}`,
        });
        return;
      default:
        return;
    }
  };

  return { handleMessage };
}
