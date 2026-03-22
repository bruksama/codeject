import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatActionCard } from '@/components/chat/chat-action-card';
import type { ChatActionRequest } from '@/types';

const freeInputAction: Extract<ChatActionRequest, { kind: 'free-input' }> = {
  context: 'Project name:',
  id: 'action-free-input',
  kind: 'free-input',
  prompt: 'Type a project name',
  source: 'terminal',
};

describe('ChatActionCard', () => {
  it('preserves the draft when free-input submission fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<ChatActionCard actionRequest={freeInputAction} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('Type a reply for the CLI');
    fireEvent.change(input, { target: { value: 'codeject' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('codeject'));
    expect(input).toHaveValue('codeject');
  });

  it('clears the draft after a successful free-input submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<ChatActionCard actionRequest={freeInputAction} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('Type a reply for the CLI');
    fireEvent.change(input, { target: { value: 'codeject' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('codeject'));
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('disables quick-action buttons while submission is in progress', () => {
    const onSubmit = vi.fn();
    render(
      <ChatActionCard
        actionRequest={{
          id: 'confirm-action',
          kind: 'confirm',
          options: [
            { label: 'Yes', submit: 'y', value: 'yes' },
            { label: 'No', submit: 'n', value: 'no' },
          ],
          prompt: 'Continue?',
          source: 'transcript',
        }}
        isSubmitting
        onSubmit={onSubmit}
      />
    );

    const button = screen.getByRole('button', { name: 'Yes' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
