'use client';

import { useRouter } from 'next/navigation';

interface SessionListEmptyStateProps {
  hasSearch: boolean;
}

export function SessionListEmptyState({ hasSearch }: SessionListEmptyStateProps) {
  const router = useRouter();

  return (
    <div className="fade-in flex flex-col items-center justify-center px-8 py-20 text-center">
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
      >
        {hasSearch ? '🔍' : '💬'}
      </div>
      <h2 className="text-base font-semibold text-white/86">
        {hasSearch ? 'No sessions found' : 'No sessions yet'}
      </h2>
      <p className="mt-2 max-w-sm text-base leading-7 text-white/45">
        {hasSearch
          ? 'Try a different search term or clear the current filter.'
          : 'Start a session for Claude Code, Codex, or another CLI assistant and it will appear here.'}
      </p>
      {!hasSearch ? (
        <button
          className="interactive-focus-ring accent-gradient accent-glow-sm mt-6 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
          onClick={() => router.push('/new-session-setup')}
          type="button"
        >
          Create First Session
        </button>
      ) : null}
    </div>
  );
}
