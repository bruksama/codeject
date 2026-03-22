'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ApiError,
  apiClient,
  clearStoredApiKey,
  getStoredApiKey,
  setStoredApiKey,
  type TunnelStatusResponse,
} from '@/lib/api-client';
import { useAppStore } from '@/stores/useAppStore';
import {
  selectRemoteAccessSettings,
  selectUpdateRemoteAccess,
} from '@/stores/use-app-store-selectors';
import type { TunnelMode } from '@/types';

const TUNNEL_DRAFT_STORAGE_KEY = 'codeject-tunnel-draft';

function readTunnelDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(TUNNEL_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      namedTunnelHostname?: string;
      tunnelMode?: TunnelMode;
    };

    if (parsed.tunnelMode !== 'quick' && parsed.tunnelMode !== 'named-token') {
      return null;
    }

    return {
      namedTunnelHostname: parsed.namedTunnelHostname ?? '',
      tunnelMode: parsed.tunnelMode,
    };
  } catch {
    return null;
  }
}

function writeTunnelDraft(tunnelMode: TunnelMode, namedTunnelHostname: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    TUNNEL_DRAFT_STORAGE_KEY,
    JSON.stringify({ namedTunnelHostname, tunnelMode })
  );
}

export function useRemoteAccessSettings() {
  const remoteAccess = useAppStore(selectRemoteAccessSettings);
  const updateRemoteAccess = useAppStore(selectUpdateRemoteAccess);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [storedAuthKeyInput, setStoredAuthKeyInput] = useState('');
  const [isTunnelAction, setIsTunnelAction] = useState<'start' | 'stop' | 'restart' | null>(null);
  const [isSavingTunnelConfig, setIsSavingTunnelConfig] = useState(false);
  const [tunnelDetails, setTunnelDetails] = useState<TunnelStatusResponse | null>(null);
  const [tunnelError, setTunnelError] = useState<string | null>(null);
  const [tunnelModeInput, setTunnelModeInput] = useState<TunnelMode>('quick');
  const [namedTunnelHostnameInput, setNamedTunnelHostnameInput] = useState('');
  const [namedTunnelTokenInput, setNamedTunnelTokenInput] = useState('');
  const [isTunnelDraftReady, setIsTunnelDraftReady] = useState(false);
  const tunnelConfigDirtyRef = useRef(false);

  const clearRemoteAccessRuntimeState = useCallback(
    (message: string) => {
      clearStoredApiKey();
      setTunnelDetails(null);
      setTunnelError(message);
      updateRemoteAccess({
        autoStart: false,
        authKey: '',
        enabled: false,
        namedTunnelHostname: undefined,
        namedTunnelTokenConfigured: false,
        tunnelStatus: 'inactive',
        tunnelUrl: undefined,
      });
    },
    [updateRemoteAccess]
  );

  const syncRemoteAccessFromTunnel = useCallback(
    (tunnel: TunnelStatusResponse) => {
      updateRemoteAccess({
        autoStart: tunnel.autoStart,
        enabled: tunnel.authConfigured,
        namedTunnelHostname: tunnel.namedTunnelHostname,
        namedTunnelTokenConfigured: tunnel.namedTunnelTokenConfigured,
        tunnelMode: tunnel.tunnelMode,
        tunnelStatus: tunnel.status,
        tunnelUrl: tunnel.publicUrl,
      });
    },
    [updateRemoteAccess]
  );

  const loadTunnelStatus = useCallback(
    async (silent = false) => {
      try {
        const tunnel = await apiClient.getTunnelStatus();
        setTunnelDetails(tunnel);
        setTunnelError(null);

        if (!tunnelConfigDirtyRef.current) {
          setTunnelModeInput(tunnel.tunnelMode);
          setNamedTunnelHostnameInput(tunnel.namedTunnelHostname ?? '');
        }

        syncRemoteAccessFromTunnel(tunnel);
        return tunnel;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearRemoteAccessRuntimeState(
            'Enter the API key on this device to inspect remote access over the tunnel.'
          );
          return null;
        }

        const message =
          error instanceof Error ? error.message : 'Failed to load remote access status';
        setTunnelError(message);
        if (!silent) {
          toast.error(message);
        }
        return null;
      }
    },
    [clearRemoteAccessRuntimeState, syncRemoteAccessFromTunnel]
  );

  useEffect(() => {
    void apiClient
      .getAuthStatus()
      .then((authStatus) => {
        updateRemoteAccess({ enabled: authStatus.configured });
      })
      .catch(() => undefined);

    setStoredAuthKeyInput(getStoredApiKey());
    const tunnelDraft = readTunnelDraft();
    if (tunnelDraft) {
      setTunnelModeInput(tunnelDraft.tunnelMode);
      setNamedTunnelHostnameInput(tunnelDraft.namedTunnelHostname);
      tunnelConfigDirtyRef.current = true;
    }
    setIsTunnelDraftReady(true);
    void loadTunnelStatus();

    const pollTimer = window.setInterval(() => {
      void loadTunnelStatus(true);
    }, 5000);

    return () => window.clearInterval(pollTimer);
  }, [loadTunnelStatus, updateRemoteAccess]);

  useEffect(() => {
    if (!isTunnelDraftReady) {
      return;
    }
    writeTunnelDraft(tunnelModeInput, namedTunnelHostnameInput);
  }, [isTunnelDraftReady, namedTunnelHostnameInput, tunnelModeInput]);

  const handleRotateKey = async () => {
    setIsRotatingKey(true);
    try {
      const apiKey = await apiClient.rotateApiKey();
      setStoredAuthKeyInput(apiKey);
      updateRemoteAccess({ authKey: apiKey, enabled: true });
      setTunnelError(null);
      const tunnel = await loadTunnelStatus();
      if (tunnel) {
        toast.success('API key rotated');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rotate API key');
    } finally {
      setIsRotatingKey(false);
    }
  };

  const handleTunnelAction = async (action: 'start' | 'stop' | 'restart') => {
    setIsTunnelAction(action);
    try {
      const tunnel =
        action === 'start'
          ? await apiClient.startTunnel()
          : action === 'stop'
            ? await apiClient.stopTunnel()
            : await apiClient.restartTunnel();
      setTunnelDetails(tunnel);
      setTunnelError(null);
      syncRemoteAccessFromTunnel(tunnel);
      toast.success(
        action === 'start'
          ? 'Remote access started'
          : action === 'stop'
            ? 'Remote access stopped'
            : 'Remote access restarted'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tunnel action failed';
      setTunnelError(message);
      toast.error(message);
    } finally {
      setIsTunnelAction(null);
    }
  };

  const handleSaveTunnelConfig = async () => {
    setIsSavingTunnelConfig(true);
    try {
      const tunnel = await apiClient.saveTunnelConfiguration({
        namedTunnelHostname: namedTunnelHostnameInput,
        namedTunnelToken: tunnelModeInput === 'named-token' ? namedTunnelTokenInput : undefined,
        tunnelMode: tunnelModeInput,
      });
      setTunnelDetails(tunnel);
      setTunnelError(null);
      tunnelConfigDirtyRef.current = false;
      setTunnelModeInput(tunnel.tunnelMode);
      setNamedTunnelHostnameInput(tunnel.namedTunnelHostname ?? '');
      setNamedTunnelTokenInput('');
      writeTunnelDraft(tunnel.tunnelMode, tunnel.namedTunnelHostname ?? '');
      syncRemoteAccessFromTunnel(tunnel);
      toast.success(
        tunnelModeInput === 'quick' ? 'Quick tunnel mode saved' : 'Named tunnel configuration saved'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save tunnel configuration';
      setTunnelError(message);
      toast.error(message);
    } finally {
      setIsSavingTunnelConfig(false);
    }
  };

  const handleSetTunnelAutoStart = async (checked: boolean) => {
    try {
      const next = await apiClient.setTunnelAutoStart(checked);
      setTunnelDetails(next);
      syncRemoteAccessFromTunnel(next);
      toast.success('Auto-start setting updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update auto-start');
    }
  };

  const handleSaveStoredKey = async () => {
    const nextKey = storedAuthKeyInput.trim();

    if (!nextKey) {
      clearStoredApiKey();
      setTunnelDetails(null);
      updateRemoteAccess({
        autoStart: false,
        authKey: '',
        enabled: false,
        namedTunnelHostname: undefined,
        namedTunnelTokenConfigured: false,
        tunnelStatus: 'inactive',
        tunnelUrl: undefined,
      });
      setTunnelError('Saved key cleared on this device.');
      toast.success('Saved API key cleared');
      return;
    }

    setStoredApiKey(nextKey);
    updateRemoteAccess({ authKey: nextKey });
    setTunnelError(null);
    const tunnel = await loadTunnelStatus();
    if (tunnel) {
      toast.success('API key saved on this device');
    }
  };

  const tunnelUrl = tunnelDetails?.publicUrl ?? remoteAccess.tunnelUrl;
  const tunnelStatus = tunnelDetails?.status ?? remoteAccess.tunnelStatus;
  const canStartTunnel =
    tunnelDetails?.canStart ?? Boolean(remoteAccess.enabled && remoteAccess.authKey);
  const selectedTunnelMode = tunnelDetails?.tunnelMode ?? remoteAccess.tunnelMode;
  const namedTunnelHostname =
    tunnelDetails?.namedTunnelHostname ?? remoteAccess.namedTunnelHostname ?? '';
  const namedTunnelTokenConfigured =
    tunnelDetails?.namedTunnelTokenConfigured ?? remoteAccess.namedTunnelTokenConfigured;
  const autoStart = tunnelDetails?.autoStart ?? remoteAccess.autoStart;
  const canToggleTunnelAutoStart = Boolean(namedTunnelHostname && namedTunnelTokenConfigured);
  const tunnelBusy =
    isTunnelAction !== null ||
    isSavingTunnelConfig ||
    tunnelStatus === 'starting' ||
    tunnelStatus === 'stopping';

  return {
    autoStart,
    canToggleTunnelAutoStart,
    canStartTunnel,
    handleRotateKey,
    handleSaveStoredKey,
    handleSetTunnelAutoStart,
    handleSaveTunnelConfig,
    handleTunnelAction,
    isRotatingKey,
    isSavingTunnelConfig,
    isTunnelAction,
    namedTunnelHostname,
    namedTunnelHostnameInput,
    namedTunnelTokenConfigured,
    namedTunnelTokenInput,
    remoteAccess,
    selectedTunnelMode,
    setNamedTunnelHostnameInput: (value: string) => {
      tunnelConfigDirtyRef.current = true;
      setNamedTunnelHostnameInput(value);
    },
    setNamedTunnelTokenInput,
    setStoredAuthKeyInput,
    setTunnelModeInput: (value: TunnelMode) => {
      tunnelConfigDirtyRef.current = true;
      setTunnelModeInput(value);
    },
    storedAuthKeyInput,
    tunnelBusy,
    tunnelDetails,
    tunnelError,
    tunnelModeInput,
    tunnelStatus,
    tunnelUrl,
  };
}
