'use client';

import InlineAlertBanner from '@/components/ui/inline-alert-banner';

interface TerminalRequiredBannerProps {
  reason?: string;
  showTerminalTabHint?: boolean;
}

export function TerminalRequiredBanner({
  reason,
  showTerminalTabHint = false,
}: TerminalRequiredBannerProps) {
  return (
    <InlineAlertBanner
      message={
        showTerminalTabHint
          ? reason
            ? `${reason} Switch to the Terminal tab for direct interaction.`
            : 'Switch to the Terminal tab for direct interaction.'
          : reason
            ? `${reason} Use the action card below to continue.`
            : 'Reply in the card below to continue.'
      }
      title="CLI needs input"
      tone="warning"
    />
  );
}
