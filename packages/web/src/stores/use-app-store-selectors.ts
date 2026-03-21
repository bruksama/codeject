import { useAppStore } from '@/stores/useAppStore';

type AppStoreState = ReturnType<typeof useAppStore.getState>;

export const selectActiveSessionId = (state: AppStoreState) => state.activeSessionId;
export const selectActiveSessionOrFirstSession = (state: AppStoreState) =>
  state.sessions.find((session) => session.id === state.activeSessionId) ?? state.sessions[0];
export const selectClearSessions = (state: AppStoreState) => state.clearSessions;
export const selectCliPrograms = (state: AppStoreState) => state.cliPrograms;
export const selectRemoteAccessSettings = (state: AppStoreState) => state.settings.remoteAccess;
export const selectResetSettings = (state: AppStoreState) => state.resetSettings;
export const selectSessions = (state: AppStoreState) => state.sessions;
export const selectSetActiveSession = (state: AppStoreState) => state.setActiveSession;
export const selectSettings = (state: AppStoreState) => state.settings;
export const selectUpdateSettings = (state: AppStoreState) => state.updateSettings;
export const selectUpdateRemoteAccess = (state: AppStoreState) => state.updateRemoteAccess;
