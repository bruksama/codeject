'use client';

import SessionCard from '@/components/sessions/SessionCard';
import type { Session } from '@/types';

interface SessionListSectionProps {
  label: string;
  onDelete: (id: string) => void;
  sessions: Session[];
  toneClassName: string;
}

export function SessionListSection({
  label,
  onDelete,
  sessions,
  toneClassName,
}: SessionListSectionProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="mb-2">
      <h2
        className={`mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] ${toneClassName}`}
      >
        {label}
      </h2>
      {sessions.map((session) => (
        <SessionCard key={session.id} onDelete={onDelete} session={session} />
      ))}
    </section>
  );
}
