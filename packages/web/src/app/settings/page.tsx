'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wifi,
  Palette,
  Info,
  Plus,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  Github,
  FileText,
  Type,
  AlertTriangle,
  X,
  Play,
  Square,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSessionApi } from '@/hooks/use-session-api';
import AppLogo from '@/components/ui/AppLogo';
import BottomTabBar from '@/components/ui/BottomTabBar';
import ProgramIcon from '@/components/ui/program-icon';
import QrCodeGraphic from '@/components/ui/qr-code';
import SettingsGroup from '@/components/ui/SettingsGroup';
import SettingsItem from '@/components/ui/SettingsItem';
import {
  apiClient,
  ApiError,
  clearStoredApiKey,
  getStoredApiKey,
  setStoredApiKey,
  type TunnelStatusResponse,
} from '@/lib/api-client';
import { useAppStore } from '@/stores/useAppStore';
import type { TunnelMode } from '@/types';

const APP_VERSION = '1.1.0';
const GITHUB_REPOSITORY_URL = 'https://github.com/bruksama/codeject';
const GITHUB_REPOSITORY_LABEL = 'github.com/bruksama/codeject';
const TUNNEL_DRAFT_STORAGE_KEY = 'codeject-tunnel-draft';

// Tunnel status badge
function TunnelStatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'Active', bg: 'bg-green-500/15 text-green-400 border-green-500/25' },
    inactive: { label: 'Inactive', bg: 'bg-gray-500/15 text-gray-400 border-gray-500/25' },
    starting: {
      label: 'Starting',
      bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    },
    stopping: { label: 'Stopping', bg: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
    error: { label: 'Error', bg: 'bg-red-500/15 text-red-400 border-red-500/25' },
  }[status] || { label: status, bg: 'bg-gray-500/15 text-gray-400 border-gray-500/25' };

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.bg}`}>
      {config.label}
    </span>
  );
}

// Accent color picker
const ACCENT_COLORS = [
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Cyan', value: '#0891b2' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Orange', value: '#ea580c' },
];

function AccentColorPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-3 flex-wrap px-4 py-3">
      {ACCENT_COLORS.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          aria-label={`${c.label} accent`}
          className={`color-dot w-8 h-8 rounded-full flex items-center justify-center ${
            selected === c.value ? 'selected' : ''
          }`}
          style={{ background: c.value }}
        >
          {selected === c.value && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

// Auth key display
function AuthKeyDisplay({ authKey }: { authKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!authKey) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-white/40">No API key has been rotated in this browser yet.</p>
      </div>
    );
  }

  const masked =
    authKey.slice(0, 8) + '•'.repeat(Math.max(0, authKey.length - 12)) + authKey.slice(-4);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(authKey);
    } catch {
      /* noop */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Auth key copied');
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <code className="flex-1 text-xs font-mono text-white/50 truncate">
        {revealed ? authKey : masked}
      </code>
      <button
        onClick={() => setRevealed(!revealed)}
        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 active:scale-90 transition-transform"
        aria-label={revealed ? 'Hide auth key' : 'Reveal auth key'}
      >
        {revealed ? (
          <EyeOff size={13} className="text-white/40" />
        ) : (
          <Eye size={13} className="text-white/40" />
        )}
      </button>
      <button
        onClick={handleCopy}
        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 active:scale-90 transition-transform"
        aria-label="Copy auth key"
      >
        {copied ? (
          <Check size={13} className="text-green-400" />
        ) : (
          <Copy size={13} className="text-white/40" />
        )}
      </button>
    </div>
  );
}

// Confirm modal
function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4 fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full rounded-3xl overflow-hidden scale-in"
        style={{ background: 'rgba(15,15,26,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white/90">{title}</h3>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">{message}</p>
        </div>
        <div className="border-t border-white/8 flex">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-medium text-white/60 hover:bg-white/5 active:bg-white/10 transition-colors border-r border-white/8"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 text-sm font-semibold active:opacity-70 transition-opacity ${
              destructive ? 'text-red-400' : 'text-purple-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Font size label
const fontSizeLabels = { small: 'Small', medium: 'Medium', large: 'Large' };

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
    JSON.stringify({
      namedTunnelHostname,
      tunnelMode,
    })
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const { cliPrograms, sessions, settings, updateSettings, clearSessions, resetSettings } =
    useAppStore();

  const [showQrCode, setShowQrCode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [storedAuthKeyInput, setStoredAuthKeyInput] = useState('');
  const [showStoredAuthKey, setShowStoredAuthKey] = useState(false);
  const [isTunnelAction, setIsTunnelAction] = useState<'start' | 'stop' | 'restart' | null>(null);
  const [isSavingTunnelConfig, setIsSavingTunnelConfig] = useState(false);
  const [tunnelDetails, setTunnelDetails] = useState<TunnelStatusResponse | null>(null);
  const [tunnelError, setTunnelError] = useState<string | null>(null);
  const [tunnelModeInput, setTunnelModeInput] = useState<TunnelMode>('quick');
  const [namedTunnelHostnameInput, setNamedTunnelHostnameInput] = useState('');
  const [namedTunnelTokenInput, setNamedTunnelTokenInput] = useState('');
  const [isTunnelDraftReady, setIsTunnelDraftReady] = useState(false);
  const tunnelConfigDirtyRef = useRef(false);

  const { remoteAccess, fontSize, accentColor } = settings;

  useEffect(() => {
    void sessionApi.loadCliPrograms().catch(() => undefined);
    void sessionApi.loadAuthStatus().catch(() => undefined);
  }, [sessionApi]);

  useEffect(() => {
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
  }, []);

  const handleRotateKey = async () => {
    setIsRotatingKey(true);
    try {
      const apiKey = await sessionApi.rotateApiKey();
      setStoredAuthKeyInput(apiKey);
      setTunnelError(null);
      await loadTunnelStatus();
      toast.success('API key rotated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rotate API key');
    } finally {
      setIsRotatingKey(false);
    }
  };

  const handleFontSizeCycle = () => {
    const cycle = { small: 'medium', medium: 'large', large: 'small' } as const;
    updateSettings({ fontSize: cycle[fontSize] });
  };

  const loadTunnelStatus = async (silent = false) => {
    try {
      const tunnel = await apiClient.getTunnelStatus();
      setTunnelDetails(tunnel);
      setTunnelError(null);
      if (!tunnelConfigDirtyRef.current) {
        setTunnelModeInput(tunnel.tunnelMode);
        setNamedTunnelHostnameInput(tunnel.namedTunnelHostname ?? '');
      }
      useAppStore.getState().updateRemoteAccess({
        enabled: tunnel.authConfigured,
        namedTunnelHostname: tunnel.namedTunnelHostname,
        namedTunnelTokenConfigured: tunnel.namedTunnelTokenConfigured,
        tunnelMode: tunnel.tunnelMode,
        tunnelStatus: tunnel.status,
        tunnelUrl: tunnel.publicUrl,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setTunnelError(
          'Enter the API key on this device to inspect remote access over the tunnel.'
        );
        if (!silent) {
          useAppStore
            .getState()
            .updateRemoteAccess({ tunnelStatus: 'inactive', tunnelUrl: undefined });
        }
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Failed to load remote access status';
      setTunnelError(message);
      if (!silent) {
        toast.error(message);
      }
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
      useAppStore.getState().updateRemoteAccess({
        enabled: tunnel.authConfigured,
        namedTunnelHostname: tunnel.namedTunnelHostname,
        namedTunnelTokenConfigured: tunnel.namedTunnelTokenConfigured,
        tunnelMode: tunnel.tunnelMode,
        tunnelStatus: tunnel.status,
        tunnelUrl: tunnel.publicUrl,
      });
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
      useAppStore.getState().updateRemoteAccess({
        enabled: tunnel.authConfigured,
        namedTunnelHostname: tunnel.namedTunnelHostname,
        namedTunnelTokenConfigured: tunnel.namedTunnelTokenConfigured,
        tunnelMode: tunnel.tunnelMode,
        tunnelStatus: tunnel.status,
        tunnelUrl: tunnel.publicUrl,
      });
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

  const handleSaveStoredKey = async () => {
    const nextKey = storedAuthKeyInput.trim();

    if (!nextKey) {
      clearStoredApiKey();
      useAppStore.getState().updateRemoteAccess({ authKey: '', tunnelUrl: undefined });
      setTunnelError('Saved key cleared on this device.');
      toast.success('Saved API key cleared');
      return;
    }

    setStoredApiKey(nextKey);
    useAppStore.getState().updateRemoteAccess({ authKey: nextKey });
    setTunnelError(null);
    await loadTunnelStatus();
    toast.success('API key saved on this device');
  };

  const tunnelUrl = tunnelDetails?.publicUrl ?? remoteAccess.tunnelUrl;
  const tunnelStatus = tunnelDetails?.status ?? remoteAccess.tunnelStatus;
  const canStartTunnel = tunnelDetails?.canStart ?? remoteAccess.enabled;
  const selectedTunnelMode = tunnelDetails?.tunnelMode ?? remoteAccess.tunnelMode;
  const namedTunnelHostname =
    tunnelDetails?.namedTunnelHostname ?? remoteAccess.namedTunnelHostname ?? '';
  const namedTunnelTokenConfigured =
    tunnelDetails?.namedTunnelTokenConfigured ?? remoteAccess.namedTunnelTokenConfigured;
  const tunnelBusy =
    isTunnelAction !== null ||
    isSavingTunnelConfig ||
    tunnelStatus === 'starting' ||
    tunnelStatus === 'stopping';

  useEffect(() => {
    if (!isTunnelDraftReady) {
      return;
    }
    writeTunnelDraft(tunnelModeInput, namedTunnelHostnameInput);
  }, [isTunnelDraftReady, namedTunnelHostnameInput, tunnelModeInput]);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: '#08080f', paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      {/* Header */}
      <header className="px-4 pt-3 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <AppLogo size={32} />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white/90">Settings</h1>
            <p className="text-[10px] text-white/30 -mt-0.5">Codeject v{APP_VERSION}</p>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-1"
        style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* CLI Programs */}
        <SettingsGroup title="CLI Programs">
          {cliPrograms.map((program, i) => (
            <SettingsItem
              key={program.id}
              icon={<ProgramIcon alt={program.name} icon={program.icon} size={18} />}
              label={program.name}
              sublabel={program.command}
              type="disclosure"
              showDivider={i < cliPrograms.length}
              onClick={() => router.push(`/cli-program-editor?id=${program.id}`)}
            />
          ))}
          <SettingsItem
            icon={<Plus size={16} className="accent-text" />}
            label="Add CLI Program"
            type="disclosure"
            showDivider={false}
            onClick={() => router.push('/cli-program-editor')}
          />
        </SettingsGroup>

        {/* Remote Access */}
        <SettingsGroup title="Remote Access">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 24%, transparent)',
              }}
            >
              <Wifi size={14} className="accent-text" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90">Cloudflare Tunnel</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Manual start in dev. QR shares only the public URL.
              </p>
            </div>
            <TunnelStatusBadge status={tunnelStatus} />
          </div>

          <div className="px-4 py-3 border-b border-white/5 space-y-3">
            <div
              className="rounded-2xl px-3 py-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Tunnel Mode
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Quick stays zero-setup. Named uses your Cloudflare hostname and token.
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      tunnelModeInput === 'quick'
                        ? 'bg-white text-[#08080f]'
                        : 'text-white/60 hover:text-white/85'
                    }`}
                    onClick={() => {
                      tunnelConfigDirtyRef.current = true;
                      setTunnelModeInput('quick');
                    }}
                    type="button"
                  >
                    Quick
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      tunnelModeInput === 'named-token'
                        ? 'bg-white text-[#08080f]'
                        : 'text-white/60 hover:text-white/85'
                    }`}
                    onClick={() => {
                      tunnelConfigDirtyRef.current = true;
                      setTunnelModeInput('named-token');
                    }}
                    type="button"
                  >
                    Named
                  </button>
                </div>
              </div>
            </div>

            {tunnelModeInput === 'named-token' ? (
              <div
                className="rounded-2xl px-3 py-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Named Tunnel
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Save the public hostname and tunnel token from your Cloudflare account.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/50">
                    {namedTunnelTokenConfigured ? 'Token saved' : 'Token missing'}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/85 outline-none placeholder:text-white/25"
                    onChange={(event) => {
                      tunnelConfigDirtyRef.current = true;
                      setNamedTunnelHostnameInput(event.target.value);
                    }}
                    placeholder="codeject.example.com"
                    type="text"
                    value={namedTunnelHostnameInput}
                  />
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/85 outline-none placeholder:text-white/25"
                    onChange={(event) => {
                      tunnelConfigDirtyRef.current = true;
                      setNamedTunnelTokenInput(event.target.value);
                    }}
                    placeholder={
                      namedTunnelTokenConfigured
                        ? 'Leave blank to keep saved token'
                        : 'Paste tunnel token'
                    }
                    type="password"
                    value={namedTunnelTokenInput}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-white/35">
                    Current hostname: {namedTunnelHostname || 'Not configured'}
                  </p>
                  <button
                    className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-white/85 disabled:opacity-40"
                    disabled={isSavingTunnelConfig}
                    onClick={() => void handleSaveTunnelConfig()}
                    type="button"
                  >
                    {isSavingTunnelConfig ? 'Saving…' : 'Save named tunnel'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl px-3 py-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Quick Tunnel
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Uses a temporary `trycloudflare.com` URL. Best for zero-setup remote access.
                    </p>
                  </div>
                  <button
                    className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-white/85 disabled:opacity-40"
                    disabled={isSavingTunnelConfig}
                    onClick={() => void handleSaveTunnelConfig()}
                    type="button"
                  >
                    {isSavingTunnelConfig ? 'Saving…' : 'Use quick tunnel'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void handleTunnelAction('start')}
                disabled={tunnelBusy || !canStartTunnel}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 bg-green-500/15 border border-green-500/25 disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-2">
                  <Play size={14} className="text-green-400" />
                  {isTunnelAction === 'start' ? 'Starting…' : 'Start'}
                </span>
              </button>
              <button
                onClick={() => void handleTunnelAction('stop')}
                disabled={tunnelBusy || tunnelStatus === 'inactive'}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 bg-white/6 border border-white/10 disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-2">
                  <Square size={14} className="text-white/60" />
                  {isTunnelAction === 'stop' ? 'Stopping…' : 'Stop'}
                </span>
              </button>
              <button
                onClick={() => void handleTunnelAction('restart')}
                disabled={tunnelBusy || tunnelStatus === 'inactive'}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 bg-white/6 border border-white/10 disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw size={14} className="text-white/60" />
                  {isTunnelAction === 'restart' ? 'Restarting…' : 'Restart'}
                </span>
              </button>
            </div>

            <div
              className="rounded-2xl px-3 py-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Public URL
                  </p>
                  <p className="text-sm text-white/80 break-all mt-1">
                    {tunnelUrl ?? 'Tunnel not active'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!tunnelUrl) return;
                    try {
                      await navigator.clipboard.writeText(tunnelUrl);
                      toast.success('Tunnel URL copied');
                    } catch {
                      toast.error('Failed to copy tunnel URL');
                    }
                  }}
                  disabled={!tunnelUrl}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/6 disabled:opacity-40"
                  aria-label="Copy tunnel URL"
                >
                  <Copy size={14} className="text-white/50" />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowQrCode(true)}
                  disabled={!tunnelUrl}
                  className="rounded-xl px-3 py-2 text-xs font-medium text-white/85 bg-white/6 border border-white/10 disabled:opacity-40"
                >
                  Show QR
                </button>
                <span className="text-[11px] text-white/35 self-center">
                  {selectedTunnelMode === 'quick'
                    ? 'Quick mode returns a temporary URL each start.'
                    : 'Named mode keeps the hostname fixed and uses the saved token.'}
                </span>
                {tunnelDetails?.isDevelopment && (
                  <span className="text-[11px] text-white/35 self-center">
                    Dev mode stays manual. `Ctrl+C` stops the managed tunnel.
                  </span>
                )}
              </div>
            </div>

            <div
              className="rounded-2xl px-3 py-3"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 9%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 18%, transparent)',
              }}
            >
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="accent-text" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Device Auth
                </p>
              </div>
              <p className="mt-2 text-xs text-white/50">
                QR shares only the public URL. Save the bearer key on this device once to unlock
                remote REST and WebSocket calls.
              </p>
              <div className="mt-3 rounded-xl border border-white/8 bg-white/5">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-white/8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Browser Key
                    </p>
                    <p className="mt-1 text-[11px] text-white/40">
                      {remoteAccess.enabled
                        ? 'Configured for remote access'
                        : 'Rotate locally to create one'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      void handleRotateKey();
                    }}
                    className="accent-chip rounded-lg border px-3 py-1.5 text-xs font-medium"
                    disabled={isRotatingKey}
                    type="button"
                  >
                    {isRotatingKey ? 'Rotating…' : 'Rotate'}
                  </button>
                </div>
                <AuthKeyDisplay authKey={remoteAccess.authKey} />
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2">
                <input
                  value={storedAuthKeyInput}
                  onChange={(event) => setStoredAuthKeyInput(event.target.value)}
                  placeholder="Paste bearer key on this device"
                  className="flex-1 bg-transparent text-xs text-white/80 outline-none placeholder:text-white/25"
                  type={showStoredAuthKey ? 'text' : 'password'}
                />
                <button
                  onClick={() => setShowStoredAuthKey((current) => !current)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6"
                  aria-label={showStoredAuthKey ? 'Hide stored key' : 'Show stored key'}
                >
                  {showStoredAuthKey ? (
                    <EyeOff size={13} className="text-white/45" />
                  ) : (
                    <Eye size={13} className="text-white/45" />
                  )}
                </button>
                <button
                  onClick={() => void handleSaveStoredKey()}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 bg-white/8"
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>

            {(tunnelError ||
              tunnelDetails?.lastError ||
              tunnelDetails?.binaryAvailable === false) && (
              <div className="rounded-xl px-3 py-2.5 bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-200/85">
                  {tunnelError ??
                    tunnelDetails?.lastError ??
                    'cloudflared is required to start remote access.'}
                </p>
              </div>
            )}
          </div>
        </SettingsGroup>

        {/* Appearance */}
        <SettingsGroup title="Appearance">
          {/* Accent color */}
          <div>
            <div
              className="settings-row flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-white/5"
              onClick={() => setShowAccentPicker(!showAccentPicker)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-primary) 24%, transparent)',
                }}
              >
                <Palette size={15} className="accent-text" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white/90">Accent Color</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full" style={{ background: accentColor }} />
                <ChevronRight
                  size={16}
                  className={`text-white/25 transition-transform duration-200 ${showAccentPicker ? 'rotate-90' : ''}`}
                />
              </div>
            </div>
            {showAccentPicker && (
              <div className="border-b border-white/5 slide-up">
                <AccentColorPicker
                  selected={accentColor}
                  onChange={(color) => {
                    updateSettings({ accentColor: color });
                    toast.success('Accent color updated');
                  }}
                />
              </div>
            )}
          </div>

          {/* Font size */}
          <SettingsItem
            icon={<Type size={16} className="accent-text" />}
            label="Font Size"
            type="value"
            value={fontSizeLabels[fontSize]}
            showDivider
            onClick={handleFontSizeCycle}
          />
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="About">
          <SettingsItem
            icon={<Info size={16} className="accent-text" />}
            label="Version"
            type="value"
            value={APP_VERSION}
            showDivider
          />
          <SettingsItem
            icon={<Github size={16} className="accent-text" />}
            label="GitHub Repository"
            sublabel={GITHUB_REPOSITORY_LABEL}
            type="disclosure"
            showDivider
            onClick={() => window.open(GITHUB_REPOSITORY_URL, '_blank', 'noopener,noreferrer')}
          />
          <SettingsItem
            icon={<FileText size={16} className="accent-text" />}
            label="Licenses"
            type="disclosure"
            showDivider
            onClick={() => toast.info('Open source licenses')}
          />
          <SettingsItem
            icon={<FileText size={16} className="accent-text" />}
            label="Privacy Policy"
            type="disclosure"
            showDivider={false}
            onClick={() => toast.info('Privacy policy')}
          />
        </SettingsGroup>

        {/* Danger zone */}
        <SettingsGroup title="Danger Zone">
          <SettingsItem
            label="Clear All Sessions"
            type="destructive"
            showDivider
            onClick={() => setConfirmDelete('all-sessions')}
          />
          <SettingsItem
            label="Reset All Settings"
            type="destructive"
            showDivider={false}
            onClick={() => setConfirmDelete('reset-settings')}
          />
        </SettingsGroup>

        {/* Version footer */}
        <div className="flex flex-col items-center gap-1 py-6">
          <AppLogo size={28} />
          <p className="text-xs text-white/20 mt-1">Codeject · v{APP_VERSION}</p>
          <p className="text-[10px] text-white/15">Built for developers, by developers</p>
        </div>
      </div>

      {/* Bottom tab bar */}
      <BottomTabBar />

      {/* QR Code modal */}
      {showQrCode && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4 fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
          onClick={() => setShowQrCode(false)}
        >
          <div
            className="w-full rounded-3xl overflow-hidden scale-in"
            style={{
              background: 'rgba(15,15,26,0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
              <h3 className="text-base font-semibold text-white/90">Scan to Connect</h3>
              <button
                onClick={() => setShowQrCode(false)}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center active:scale-90"
                aria-label="Close"
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>
            <div className="flex flex-col items-center py-8 px-6 gap-4">
              {tunnelUrl ? <QrCodeGraphic value={tunnelUrl} /> : null}
              <div className="text-center">
                <p className="text-sm font-medium text-white/70 mb-1">
                  {tunnelUrl || 'Tunnel not active'}
                </p>
                <p className="text-xs text-white/35">
                  Open the URL, then paste the bearer key on the phone from Settings.
                </p>
              </div>
              <div
                className="w-full rounded-xl px-4 py-3 flex items-center gap-2"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)',
                }}
              >
                <Eye size={13} className="accent-text flex-shrink-0" />
                <p className="text-xs text-white/50">
                  QR does not include the bearer key. Share the key separately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modals */}
      {confirmDelete === 'all-sessions' && (
        <ConfirmModal
          title="Clear All Sessions"
          message="This will permanently delete all sessions and their conversation history. This cannot be undone."
          confirmLabel="Delete All"
          destructive
          onConfirm={() => {
            void Promise.all(sessions.map((session) => sessionApi.deleteSession(session.id)))
              .then(() => {
                clearSessions();
                setConfirmDelete(null);
                toast.success('All sessions cleared');
              })
              .catch((error) => {
                toast.error(error instanceof Error ? error.message : 'Failed to clear sessions');
              });
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmDelete === 'reset-settings' && (
        <ConfirmModal
          title="Reset Settings"
          message="This resets local appearance and cached auth settings. Saved CLI programs remain on the backend."
          confirmLabel="Reset"
          destructive
          onConfirm={() => {
            resetSettings();
            setConfirmDelete(null);
            toast.success('Settings reset to defaults');
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
