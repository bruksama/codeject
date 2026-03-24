'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AppState, type CliProgram, type Message, type Session } from '@/types';

interface StoreState extends AppState {
  clearSessions: () => void;
  resetSettings: () => void;
  setCliPrograms: (programs: CliProgram[]) => void;
  setSessions: (sessions: Session[]) => void;
  upsertSession: (session: Session) => void;
}

const defaultState = {
  activeSessionId: null,
  cliPrograms: [],
  sessions: [],
  settings: {
    accentColor: '#7c3aed',
    fontSize: 'medium' as const,
    remoteAccess: {
      autoStart: false,
      authKey: '',
      enabled: false,
      namedTunnelHostname: undefined,
      namedTunnelTokenConfigured: false,
      tunnelMode: 'quick' as const,
      tunnelStatus: 'inactive' as const,
      tunnelUrl: undefined,
    },
    theme: 'dark' as const,
    notifications: false,
  },
};

export const useAppStore = create<StoreState>()(
  persist(
    (set) => ({
      ...defaultState,

      addCliProgram: (program) =>
        set((state) => ({ cliPrograms: [...state.cliPrograms, program] })),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  lastMessageAt: message.timestamp,
                  messages: [...session.messages, message],
                }
              : session
          ),
        })),

      addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),

      clearSessions: () => set({ activeSessionId: null, sessions: [] }),

      deleteCliProgram: (id) =>
        set((state) => ({
          cliPrograms: state.cliPrograms.filter((program) => program.id !== id),
        })),

      deleteSession: (id) =>
        set((state) => ({
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
          sessions: state.sessions.filter((session) => session.id !== id),
        })),

      resetSettings: () => set({ settings: defaultState.settings }),

      setActiveSession: (id) => set({ activeSessionId: id }),

      setCliPrograms: (cliPrograms) => set({ cliPrograms }),

      setSessions: (sessions) =>
        set((state) => ({
          activeSessionId:
            state.activeSessionId &&
            sessions.some((session) => session.id === state.activeSessionId)
              ? state.activeSessionId
              : (sessions[0]?.id ?? null),
          sessions,
        })),

      updateCliProgram: (id, updates) =>
        set((state) => ({
          cliPrograms: state.cliPrograms.map((program) =>
            program.id === id ? { ...program, ...updates } : program
          ),
        })),

      updateMessage: (sessionId, messageId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((message: Message) =>
                    message.id === messageId ? { ...message, ...updates } : message
                  ),
                }
              : session
          ),
        })),

      updateRemoteAccess: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            remoteAccess: { ...state.settings.remoteAccess, ...updates },
          },
        })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, ...updates } : session
          ),
        })),

      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

      upsertSession: (session) =>
        set((state) => {
          const exists = state.sessions.some((item) => item.id === session.id);
          return {
            activeSessionId: state.activeSessionId ?? session.id,
            sessions: exists
              ? state.sessions.map((item) => (item.id === session.id ? session : item))
              : [session, ...state.sessions],
          };
        }),
    }),
    {
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<StoreState> | undefined) ?? {};
        return {
          ...currentState,
          ...persisted,
          settings: {
            ...currentState.settings,
            ...persisted.settings,
            remoteAccess: {
              ...currentState.settings.remoteAccess,
              ...persisted.settings?.remoteAccess,
            },
          },
        };
      },
      name: 'codeject-storage',
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        settings: state.settings,
      }),
    }
  )
);
