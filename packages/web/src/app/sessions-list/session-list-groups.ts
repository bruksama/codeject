import type { Session } from '@/types';

export interface SessionGroups {
  active: Session[];
  disconnected: Session[];
  error: Session[];
  idle: Session[];
}

export function buildSessionGroups(sessions: Session[]): SessionGroups {
  return sessions.reduce<SessionGroups>(
    (groups, session) => {
      if (
        session.status === 'connected' ||
        session.status === 'connecting' ||
        session.status === 'starting'
      ) {
        groups.active.push(session);
      } else if (session.status === 'idle') {
        groups.idle.push(session);
      } else if (session.status === 'error') {
        groups.error.push(session);
      } else {
        groups.disconnected.push(session);
      }

      return groups;
    },
    {
      active: [],
      disconnected: [],
      error: [],
      idle: [],
    }
  );
}
