'use client';

import { useMemo } from 'react';
import { type CliProgram } from '@/types';
import { apiClient, type SessionCreateInput } from '@/lib/api-client';
import { useAppStore } from '@/stores/useAppStore';

export function useSessionApi() {
  const setSessions = useAppStore((state) => state.setSessions);
  const upsertSession = useAppStore((state) => state.upsertSession);
  const deleteSessionFromStore = useAppStore((state) => state.deleteSession);
  const setCliPrograms = useAppStore((state) => state.setCliPrograms);
  const updateRemoteAccess = useAppStore((state) => state.updateRemoteAccess);

  return useMemo(
    () => ({
      async createCliProgram(program: Omit<CliProgram, 'id'>) {
        const savedProgram = await apiClient.saveCliProgram(program);
        setCliPrograms([...useAppStore.getState().cliPrograms, savedProgram]);
        return savedProgram;
      },

      async createSession(input: SessionCreateInput) {
        const session = await apiClient.createSession(input);
        upsertSession(session);
        return session;
      },

      async deleteCliProgram(programId: string) {
        await apiClient.deleteCliProgram(programId);
        setCliPrograms(
          useAppStore.getState().cliPrograms.filter((program) => program.id !== programId)
        );
      },

      async deleteSession(sessionId: string) {
        await apiClient.deleteSession(sessionId);
        deleteSessionFromStore(sessionId);
      },

      async loadAuthStatus() {
        const authStatus = await apiClient.getAuthStatus();
        updateRemoteAccess({ enabled: authStatus.configured });
        return authStatus;
      },

      async loadCliPrograms() {
        const cliPrograms = await apiClient.listCliPrograms();
        setCliPrograms(cliPrograms);
        return cliPrograms;
      },

      async loadSession(sessionId: string) {
        const session = await apiClient.getSession(sessionId);
        upsertSession(session);
        return session;
      },

      async loadSessions() {
        const sessions = await apiClient.listSessions();
        setSessions(sessions);
        return sessions;
      },

      async rotateApiKey() {
        const apiKey = await apiClient.rotateApiKey();
        updateRemoteAccess({ authKey: apiKey, enabled: true });
        return apiKey;
      },

      async saveCliProgram(program: Omit<CliProgram, 'id'> & { id?: string }) {
        const savedProgram = await apiClient.saveCliProgram(program);
        const currentPrograms = useAppStore.getState().cliPrograms;
        const nextPrograms = currentPrograms.some((item) => item.id === savedProgram.id)
          ? currentPrograms.map((item) => (item.id === savedProgram.id ? savedProgram : item))
          : [...currentPrograms, savedProgram];
        setCliPrograms(nextPrograms);
        return savedProgram;
      },
    }),
    [deleteSessionFromStore, setCliPrograms, setSessions, updateRemoteAccess, upsertSession]
  );
}
