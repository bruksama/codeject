'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wifi,
  Palette,
  Info,
  Plus,
  ChevronRight,
  QrCode,
  Eye,
  EyeOff,
  Copy,
  Check,
  Github,
  FileText,
  Zap,
  Type,
  Vibrate,
  AlertTriangle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSessionApi } from '@/hooks/use-session-api';
import AppLogo from '@/components/ui/AppLogo';
import BottomTabBar from '@/components/ui/BottomTabBar';
import SettingsGroup from '@/components/ui/SettingsGroup';
import SettingsItem from '@/components/ui/SettingsItem';

import { useAppStore } from '@/stores/useAppStore';

function getQrPixelIsDark(index: number) {
  const isCorner =
    (index < 30 && index % 10 < 3) ||
    (index < 30 && index % 10 > 6) ||
    (index >= 70 && index % 10 < 3);

  // Deterministic pseudo-random pattern so render stays pure.
  return isCorner || (index * 17 + 11) % 10 > 4;
}

// Tunnel status badge
function TunnelStatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'Active', bg: 'bg-green-500/15 text-green-400 border-green-500/25' },
    inactive: { label: 'Inactive', bg: 'bg-gray-500/15 text-gray-400 border-gray-500/25' },
    connecting: {
      label: 'Connecting',
      bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    },
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

export default function SettingsPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const { cliPrograms, sessions, settings, updateSettings, clearSessions, resetSettings } =
    useAppStore();

  const [showQrCode, setShowQrCode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);

  const { remoteAccess, hapticFeedback, streamingEnabled, fontSize, accentColor } = settings;

  useEffect(() => {
    void sessionApi.loadCliPrograms().catch(() => undefined);
    void sessionApi.loadAuthStatus().catch(() => undefined);
  }, [sessionApi]);

  const handleRotateKey = async () => {
    setIsRotatingKey(true);
    try {
      await sessionApi.rotateApiKey();
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
            <p className="text-[10px] text-white/30 -mt-0.5">Codeject v1.0.0</p>
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
              icon={<span className="text-lg">{program.icon}</span>}
              label={program.name}
              sublabel={program.command}
              type="disclosure"
              showDivider={i < cliPrograms.length}
              onClick={() => router.push(`/cli-program-editor?id=${program.id}`)}
            />
          ))}
          <SettingsItem
            icon={<Plus size={16} className="text-purple-400" />}
            label="Add CLI Program"
            type="disclosure"
            showDivider={false}
            onClick={() => router.push('/cli-program-editor')}
          />
        </SettingsGroup>

        {/* Remote Access */}
        <SettingsGroup title="Remote Access">
          <SettingsItem
            icon={<Wifi size={16} className="text-purple-400" />}
            label="API Key Status"
            sublabel="Remote requests require a bearer token"
            type="value"
            value={remoteAccess.enabled ? 'Configured' : 'Missing'}
            showDivider
          />

          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <Zap size={14} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90">Cloudflare Tunnel</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Tunnel controls land in Phase 5. Backend auth is live now.
              </p>
            </div>
            <TunnelStatusBadge status={remoteAccess.tunnelStatus} />
          </div>

          <div className="border-b border-white/5">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <Eye size={14} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90">Latest Rotated Key</p>
                <p className="text-xs text-white/35 mt-0.5">
                  Stored only in this browser after a local rotate request
                </p>
              </div>
            </div>
            <AuthKeyDisplay authKey={remoteAccess.authKey} />
          </div>

          <SettingsItem
            icon={<QrCode size={16} className="text-purple-400" />}
            label={isRotatingKey ? 'Rotating API Key…' : 'Rotate API Key'}
            sublabel="Generates a new bearer token from the local backend"
            type="disclosure"
            showDivider={false}
            onClick={() => {
              void handleRotateKey();
            }}
          />
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
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <Palette size={15} className="text-purple-400" />
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
            icon={<Type size={16} className="text-purple-400" />}
            label="Font Size"
            type="value"
            value={fontSizeLabels[fontSize]}
            showDivider
            onClick={handleFontSizeCycle}
          />

          {/* Streaming */}
          <SettingsItem
            icon={<Zap size={16} className="text-purple-400" />}
            label="Streaming Responses"
            sublabel="Show responses as they're generated"
            type="toggle"
            checked={streamingEnabled}
            onToggle={(v) => {
              updateSettings({ streamingEnabled: v });
              toast.success(v ? 'Streaming enabled' : 'Streaming disabled');
            }}
            showDivider
          />

          {/* Haptic feedback */}
          <SettingsItem
            icon={<Vibrate size={16} className="text-purple-400" />}
            label="Haptic Feedback"
            sublabel="Vibration on send and receive"
            type="toggle"
            checked={hapticFeedback}
            onToggle={(v) => {
              updateSettings({ hapticFeedback: v });
            }}
            showDivider={false}
          />
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="About">
          <SettingsItem
            icon={<Info size={16} className="text-purple-400" />}
            label="Version"
            type="value"
            value="1.0.0 (build 42)"
            showDivider
          />
          <SettingsItem
            icon={<Github size={16} className="text-purple-400" />}
            label="GitHub Repository"
            sublabel="github.com/codeject/codeject"
            type="disclosure"
            showDivider
            onClick={() => toast.info('Opening GitHub…')}
          />
          <SettingsItem
            icon={<FileText size={16} className="text-purple-400" />}
            label="Licenses"
            type="disclosure"
            showDivider
            onClick={() => toast.info('Open source licenses')}
          />
          <SettingsItem
            icon={<FileText size={16} className="text-purple-400" />}
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
          <p className="text-xs text-white/20 mt-1">Codeject · v1.0.0</p>
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
              {/* Mock QR code grid */}
              <div
                className="w-48 h-48 rounded-2xl p-4 relative"
                style={{ background: 'white' }}
                aria-label="QR code for remote access"
              >
                <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5">
                  {Array.from({ length: 100 }).map((_, i) => {
                    const isDark = getQrPixelIsDark(i);
                    return (
                      <div
                        key={i}
                        className="rounded-[1px]"
                        style={{ background: isDark ? '#1a1a2e' : 'transparent' }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/70 mb-1">
                  {remoteAccess.tunnelUrl || 'Tunnel arrives in Phase 5'}
                </p>
                <p className="text-xs text-white/35">
                  API auth is ready. Tunnel control is not wired yet.
                </p>
              </div>
              <div
                className="w-full rounded-xl px-4 py-3 flex items-center gap-2"
                style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <Eye size={13} className="text-purple-400 flex-shrink-0" />
                <p className="text-xs text-white/50">
                  Auth key required — keep this QR code private
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
