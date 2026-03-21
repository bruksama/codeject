'use client';

import InlineAlertBanner from '@/components/ui/inline-alert-banner';

interface TerminalRequiredBannerProps {
  reason?: string;
}

export function TerminalRequiredBanner({ reason }: TerminalRequiredBannerProps) {
  return (
    <InlineAlertBanner
      message={
        reason
          ? `${reason} Use the action card below to continue.`
          : 'Reply in the card below to continue.'
      }
      title="CLI needs input"
      tone="warning"
    />
  );
}
