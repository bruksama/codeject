import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChatMessage from '@/components/chat/ChatMessage';
import type { Message } from '@/types';

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    content: 'Previous final answer',
    id: 'message-1',
    role: 'assistant',
    timestamp: new Date('2026-03-25T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ChatMessage', () => {
  it('renders assistant content without transcript content-visibility optimization', () => {
    const { container } = render(<ChatMessage message={createMessage()} programIcon="bot" />);

    expect(screen.getByText('Previous final answer')).toBeInTheDocument();
    expect(container.querySelector('.content-auto-message')).toBeNull();
  });
});
