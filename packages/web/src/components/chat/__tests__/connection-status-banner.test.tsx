import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectionStatusBanner } from '@/components/chat/connection-status-banner';

describe('ConnectionStatusBanner', () => {
  it('shows the disconnected banner again when the same outage escalates after dismissal', () => {
    const disconnectedAt = new Date('2026-03-23T10:00:00.000Z');

    const { rerender } = render(
      <ConnectionStatusBanner
        hasConnected
        lastDisconnectedAt={disconnectedAt}
        lastReconnectedAt={null}
        status="connecting"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss connection status' }));
    expect(screen.queryByText('Reconnecting')).not.toBeInTheDocument();

    rerender(
      <ConnectionStatusBanner
        hasConnected
        lastDisconnectedAt={disconnectedAt}
        lastReconnectedAt={null}
        status="disconnected"
      />
    );

    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('does not show a transport banner for explicit error state', () => {
    render(
      <ConnectionStatusBanner
        hasConnected
        lastDisconnectedAt={new Date('2026-03-23T10:00:00.000Z')}
        lastReconnectedAt={null}
        status="error"
      />
    );

    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconnecting')).not.toBeInTheDocument();
  });
});
