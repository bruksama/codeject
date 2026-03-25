import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatComposer } from '@/components/chat/chat-composer';

describe('ChatComposer', () => {
  it('keeps the command suggestion menu visible for a visible Codex composer', () => {
    render(
      <ChatComposer cliProgramId="codex" onSubmit={vi.fn()} onValueChange={vi.fn()} value="$" />
    );

    expect(screen.getByText('ClaudeKit Commands')).toBeInTheDocument();
  });

  it('dismisses the command suggestion menu when the composer becomes hidden', () => {
    const { rerender } = render(
      <ChatComposer
        cliProgramId="codex"
        isVisible
        onSubmit={vi.fn()}
        onValueChange={vi.fn()}
        value="$"
      />
    );

    expect(screen.getByText('ClaudeKit Commands')).toBeInTheDocument();

    rerender(
      <ChatComposer
        cliProgramId="codex"
        isVisible={false}
        onSubmit={vi.fn()}
        onValueChange={vi.fn()}
        value="$"
      />
    );

    expect(screen.queryByText('ClaudeKit Commands')).not.toBeInTheDocument();
  });
});
