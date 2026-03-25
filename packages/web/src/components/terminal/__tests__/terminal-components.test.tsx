import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminalInputBar } from '@/components/terminal/terminal-input-bar';
import { TerminalSnapshotViewer } from '@/components/terminal/terminal-snapshot-viewer';
import { SessionTabSwitcher } from '@/components/terminal/session-tab-switcher';
import { TerminalVirtualKeyboard } from '@/components/terminal/terminal-virtual-keyboard';

describe('terminal components', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-scrolls the snapshot viewer while following the latest output', async () => {
    const { rerender } = render(<TerminalSnapshotViewer content="$ pwd" seq={1} />);
    const container = screen.getByTestId('terminal-snapshot-scroller');

    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 120 },
      scrollHeight: { configurable: true, value: 420 },
      scrollTop: { configurable: true, value: 300, writable: true },
    });

    rerender(<TerminalSnapshotViewer content="$ pwd\n/tmp/codeject" seq={2} />);

    await waitFor(() => expect(container.scrollTop).toBe(420));
  });

  it('shows jump-to-bottom when the viewer is scrolled up', () => {
    render(<TerminalSnapshotViewer content={'$ pwd\n/tmp/codeject'} seq={2} />);
    const container = screen.getByTestId('terminal-snapshot-scroller');

    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 120 },
      scrollHeight: { configurable: true, value: 420 },
      scrollTop: { configurable: true, value: 160, writable: true },
    });

    fireEvent.scroll(container);

    expect(screen.getByRole('button', { name: 'Jump to bottom' })).toBeInTheDocument();
  });

  it('submits terminal input once and clears the draft after success', () => {
    const onSend = vi.fn(() => true);
    render(<TerminalInputBar onSend={onSend} />);

    const input = screen.getByRole('textbox', { name: 'Terminal input' });
    fireEvent.change(input, { target: { value: 'npm init' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send terminal input' }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('npm init');
    expect(input).toHaveValue('');
  });

  it('sends special keys from the virtual keyboard', () => {
    const onKey = vi.fn();
    render(<TerminalVirtualKeyboard onKey={onKey} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tab' }));

    expect(onKey).toHaveBeenCalledWith('Tab');
  });

  it('renders the compact session tab switcher as an icon-only segmented control', () => {
    render(<SessionTabSwitcher activeTab="chat" compact onTabChange={vi.fn()} terminalBadge />);

    const chatTab = screen.getByRole('button', { name: 'Chat' });
    const terminalTab = screen.getByRole('button', { name: 'Terminal' });

    expect(chatTab.parentElement).toHaveClass('inline-flex');
    expect(chatTab).toHaveClass('rounded-full');
    expect(chatTab).toHaveAttribute('aria-pressed', 'true');
    expect(terminalTab).toHaveClass('rounded-full');
    expect(terminalTab).toHaveAttribute('aria-pressed', 'false');
    expect(chatTab).not.toHaveTextContent('Chat');
    expect(terminalTab).not.toHaveTextContent('Terminal');
    expect(chatTab.querySelector('svg')).toBeInTheDocument();
    expect(terminalTab.querySelector('svg')).toBeInTheDocument();
    expect(terminalTab.querySelector('[data-terminal-badge="true"]')).toBeInTheDocument();
  });
});
