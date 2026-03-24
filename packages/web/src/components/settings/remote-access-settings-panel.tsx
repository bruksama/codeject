'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Play,
  RefreshCw,
  Square,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import MobileActionButton from '@/components/ui/mobile-action-button';
import Toggle from '@/components/ui/Toggle';
import { useRemoteAccessSettings } from '@/hooks/use-remote-access-settings';

const RemoteAccessQrModal = dynamic(() => import('@/components/settings/remote-access-qr-modal'), {
  ssr: false,
});

function TunnelStatusBadge({ status }: { status: string }) {
  const config = {
    active: { className: 'border-green-500/25 bg-green-500/15 text-green-300', label: 'Active' },
    error: { className: 'border-red-500/25 bg-red-500/15 text-red-300', label: 'Error' },
    inactive: { className: 'border-white/10 bg-white/6 text-white/55', label: 'Inactive' },
    starting: {
      className: 'border-amber-400/25 bg-amber-400/12 text-amber-200',
      label: 'Starting',
    },
    stopping: {
      className: 'border-orange-400/25 bg-orange-400/12 text-orange-200',
      label: 'Stopping',
    },
  }[status] ?? { className: 'border-white/10 bg-white/6 text-white/55', label: status };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function StoredAuthKeyPreview({ authKey }: { authKey: string }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  if (!authKey) {
    return (
      <p className="text-sm leading-6 text-white/55">
        No rotated key is stored in this browser yet.
      </p>
    );
  }

  const masked =
    authKey.slice(0, 8) + '•'.repeat(Math.max(0, authKey.length - 12)) + authKey.slice(-4);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(authKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success('Auth key copied');
    } catch {
      toast.error('Failed to copy auth key');
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <code className="min-w-0 flex-1 truncate text-xs text-white/58">
        {revealed ? authKey : masked}
      </code>
      <MobileActionButton
        label={revealed ? 'Hide auth key' : 'Reveal auth key'}
        onClick={() => setRevealed((current) => !current)}
        size="sm"
      >
        {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
      </MobileActionButton>
      <MobileActionButton label="Copy auth key" onClick={() => void handleCopy()} size="sm">
        {copied ? <Check className="text-green-300" size={15} /> : <Copy size={15} />}
      </MobileActionButton>
    </div>
  );
}

export function RemoteAccessSettingsPanel() {
  const [showQrCode, setShowQrCode] = useState(false);
  const [showStoredAuthKey, setShowStoredAuthKey] = useState(false);
  const remote = useRemoteAccessSettings();

  const errorMessage =
    remote.tunnelError ??
    remote.tunnelDetails?.lastError ??
    (remote.tunnelDetails?.binaryAvailable === false
      ? 'cloudflared is required to start remote access.'
      : null);

  return (
    <>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="glass-card rounded-[28px] border border-white/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                <Wifi className="accent-text" size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/92">Cloudflare Tunnel</p>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Remote URL stays separate from the bearer key. Save the key per device after
                  opening the public URL.
                </p>
              </div>
            </div>
            <TunnelStatusBadge status={remote.tunnelStatus} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/92">Tunnel mode</p>
              <p className="mt-1 text-sm leading-6 text-white/55">
                Quick is temporary. Named keeps your hostname stable with a Cloudflare token.
              </p>
            </div>
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              <button
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  remote.tunnelModeInput === 'quick'
                    ? 'bg-white text-[#08080f]'
                    : 'text-white/60 hover:text-white/88'
                }`}
                onClick={() => remote.setTunnelModeInput('quick')}
                type="button"
              >
                Quick
              </button>
              <button
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  remote.tunnelModeInput === 'named-token'
                    ? 'bg-white text-[#08080f]'
                    : 'text-white/60 hover:text-white/88'
                }`}
                onClick={() => remote.setTunnelModeInput('named-token')}
                type="button"
              >
                Named
              </button>
            </div>
          </div>
        </div>

        {remote.tunnelModeInput === 'named-token' ? (
          <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white/92">Auto-start</p>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Start the named tunnel automatically when the server boots.
                </p>
              </div>
              <Toggle
                checked={remote.autoStart}
                disabled={remote.tunnelBusy || !remote.canToggleTunnelAutoStart}
                label="Auto-start named tunnel"
                onChange={(checked) => void remote.handleSetTunnelAutoStart(checked)}
              />
            </div>
            {!remote.canToggleTunnelAutoStart ? (
              <p className="text-sm leading-6 text-white/48">
                Save the named tunnel hostname and token to enable auto-start.
              </p>
            ) : null}
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                  Hostname
                </span>
                <input
                  className="input-focus rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/88 placeholder:text-white/30"
                  onChange={(event) => remote.setNamedTunnelHostnameInput(event.target.value)}
                  placeholder="codeject.example.com"
                  type="text"
                  value={remote.namedTunnelHostnameInput}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                  Tunnel token
                </span>
                <input
                  className="input-focus rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/88 placeholder:text-white/30"
                  onChange={(event) => remote.setNamedTunnelTokenInput(event.target.value)}
                  placeholder={
                    remote.namedTunnelTokenConfigured
                      ? 'Leave blank to keep saved token'
                      : 'Paste tunnel token'
                  }
                  type="password"
                  value={remote.namedTunnelTokenInput}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-white/55">
                Current hostname: {remote.namedTunnelHostname || 'Not configured'}
              </p>
              <MobileActionButton
                disabled={remote.isSavingTunnelConfig}
                label="Save named tunnel"
                onClick={() => void remote.handleSaveTunnelConfig()}
                size="sm"
                variant="accent"
              >
                <Check size={15} />
                <span className="text-xs font-semibold">
                  {remote.isSavingTunnelConfig ? 'Saving…' : 'Save named tunnel'}
                </span>
              </MobileActionButton>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white/92">Quick tunnel</p>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Uses a temporary `trycloudflare.com` URL for zero-setup sharing.
            </p>
            <div className="mt-4">
              <MobileActionButton
                disabled={remote.isSavingTunnelConfig}
                label="Use quick tunnel"
                onClick={() => void remote.handleSaveTunnelConfig()}
                size="sm"
                variant="accent"
              >
                <Check size={15} />
                <span className="text-xs font-semibold">
                  {remote.isSavingTunnelConfig ? 'Saving…' : 'Use quick tunnel'}
                </span>
              </MobileActionButton>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MobileActionButton
            disabled={remote.tunnelBusy || !remote.canStartTunnel}
            label="Start tunnel"
            onClick={() => void remote.handleTunnelAction('start')}
            variant="accent"
          >
            <Play size={15} />
            <span className="text-sm font-semibold">
              {remote.isTunnelAction === 'start' ? 'Starting…' : 'Start'}
            </span>
          </MobileActionButton>
          <MobileActionButton
            disabled={remote.tunnelBusy || remote.tunnelStatus === 'inactive'}
            label="Stop tunnel"
            onClick={() => void remote.handleTunnelAction('stop')}
          >
            <Square size={15} />
            <span className="text-sm font-semibold">
              {remote.isTunnelAction === 'stop' ? 'Stopping…' : 'Stop'}
            </span>
          </MobileActionButton>
          <MobileActionButton
            disabled={remote.tunnelBusy || remote.tunnelStatus === 'inactive'}
            label="Restart tunnel"
            onClick={() => void remote.handleTunnelAction('restart')}
          >
            <RefreshCw size={15} />
            <span className="text-sm font-semibold">
              {remote.isTunnelAction === 'restart' ? 'Restarting…' : 'Restart'}
            </span>
          </MobileActionButton>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Link2 className="accent-text" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/92">Public URL</p>
              <p className="mt-2 break-all text-sm leading-6 text-white/72">
                {remote.tunnelUrl ?? 'Tunnel not active'}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {remote.selectedTunnelMode === 'quick'
                  ? 'Quick mode returns a new URL on each start.'
                  : 'Named mode reuses the saved hostname.'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <MobileActionButton
              disabled={!remote.tunnelUrl}
              label="Copy tunnel URL"
              onClick={async () => {
                if (!remote.tunnelUrl) return;
                try {
                  await navigator.clipboard.writeText(remote.tunnelUrl);
                  toast.success('Tunnel URL copied');
                } catch {
                  toast.error('Failed to copy tunnel URL');
                }
              }}
              size="sm"
            >
              <Copy size={15} />
              <span className="text-xs font-semibold">Copy URL</span>
            </MobileActionButton>
            <MobileActionButton
              disabled={!remote.tunnelUrl}
              label="Show QR code"
              onClick={() => setShowQrCode(true)}
              size="sm"
            >
              <Wifi size={15} />
              <span className="text-xs font-semibold">Show QR</span>
            </MobileActionButton>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                <KeyRound className="accent-text" size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/92">Device auth</p>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Save the bearer key in this browser after opening the public URL on the device.
                </p>
              </div>
            </div>
            <MobileActionButton
              disabled={remote.isRotatingKey}
              label="Rotate API key"
              onClick={() => void remote.handleRotateKey()}
              size="sm"
              variant="accent"
            >
              <RefreshCw size={15} />
              <span className="text-xs font-semibold">
                {remote.isRotatingKey ? 'Rotating…' : 'Rotate'}
              </span>
            </MobileActionButton>
          </div>

          <div className="mt-4 space-y-3">
            <StoredAuthKeyPreview authKey={remote.remoteAccess.authKey} />
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <input
                aria-label="Device bearer key"
                autoCapitalize="none"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/30"
                onChange={(event) => remote.setStoredAuthKeyInput(event.target.value)}
                placeholder="Paste bearer key on this device"
                spellCheck={false}
                type={showStoredAuthKey ? 'text' : 'password'}
                value={remote.storedAuthKeyInput}
              />
              <MobileActionButton
                label={showStoredAuthKey ? 'Hide stored key' : 'Show stored key'}
                onClick={() => setShowStoredAuthKey((current) => !current)}
                size="sm"
              >
                {showStoredAuthKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </MobileActionButton>
              <MobileActionButton
                label="Save stored key"
                onClick={() => void remote.handleSaveStoredKey()}
                size="sm"
                variant="accent"
              >
                <Check size={15} />
              </MobileActionButton>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <InlineAlertBanner
            message={errorMessage}
            title="Remote access needs attention"
            tone="danger"
          />
        ) : null}
      </div>

      {showQrCode && remote.tunnelUrl ? (
        <RemoteAccessQrModal onClose={() => setShowQrCode(false)} tunnelUrl={remote.tunnelUrl} />
      ) : null}
    </>
  );
}
