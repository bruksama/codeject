'use client';

import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import MobileActionButton from '@/components/ui/mobile-action-button';

interface ChatSessionErrorRecoveryBannerProps {
  message?: string | null;
  onGoToSessions: () => void;
  onReconnect: () => void;
}

export function ChatSessionErrorRecoveryBanner({
  message,
  onGoToSessions,
  onReconnect,
}: ChatSessionErrorRecoveryBannerProps) {
  return (
    <InlineAlertBanner
      actions={
        <>
          <MobileActionButton
            label="Reconnect to session"
            onClick={onReconnect}
            size="sm"
            variant="danger"
          >
            <span className="text-xs font-semibold">Reconnect</span>
          </MobileActionButton>
          <MobileActionButton label="Return to sessions" onClick={onGoToSessions} size="sm">
            <span className="text-xs font-semibold">Back to sessions</span>
          </MobileActionButton>
        </>
      }
      message={
        message ?? 'The session connection dropped. Reconnect here or return to the sessions list.'
      }
      title="Session connection needs attention"
      tone="danger"
    />
  );
}
