'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCcw, WifiOff, X } from 'lucide-react';
import type { ConnectionStatus } from '@/types';

interface ConnectionStatusBannerProps {
  hasConnected: boolean;
  lastDisconnectedAt: Date | null;
  lastReconnectedAt: Date | null;
  onReconnectNow?: () => void;
  status: ConnectionStatus;
}

type BannerTone = 'connected' | 'disconnected' | 'reconnecting';

export function ConnectionStatusBanner({
  hasConnected,
  lastDisconnectedAt,
  lastReconnectedAt,
  onReconnectNow,
  status,
}: ConnectionStatusBannerProps) {
  const [dismissedBannerKey, setDismissedBannerKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const banner = useMemo(() => {
    if (!hasConnected) {
      return null;
    }

    if (status === 'disconnected' && lastDisconnectedAt) {
      return { cycleKey: lastDisconnectedAt.getTime(), tone: 'disconnected' as BannerTone };
    }

    if (status === 'connecting' && lastDisconnectedAt) {
      return { cycleKey: lastDisconnectedAt.getTime(), tone: 'reconnecting' as BannerTone };
    }

    if (status === 'connected' && lastReconnectedAt) {
      return { cycleKey: lastReconnectedAt.getTime(), tone: 'connected' as BannerTone };
    }

    return null;
  }, [hasConnected, lastDisconnectedAt, lastReconnectedAt, status]);

  useEffect(() => {
    if (!banner || banner.tone === 'connected') {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [banner]);

  useEffect(() => {
    if (!banner || banner.tone !== 'connected') {
      return;
    }

    const remainingMs = Math.max(0, 2_000 - (Date.now() - banner.cycleKey));
    const timeout = window.setTimeout(() => {
      setDismissedBannerKey(`${banner.cycleKey}:${banner.tone}`);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [banner]);

  const bannerKey = banner ? `${banner.cycleKey}:${banner.tone}` : null;

  if (!banner || dismissedBannerKey === bannerKey) {
    return null;
  }

  const disconnectedAtMs = lastDisconnectedAt?.getTime() ?? null;
  const elapsedLabel =
    banner.tone !== 'connected' && disconnectedAtMs !== null
      ? formatElapsedLabel(now - disconnectedAtMs)
      : null;
  const showElapsed =
    elapsedLabel !== null && disconnectedAtMs !== null && now - disconnectedAtMs >= 5_000;
  const config = getBannerConfig(banner.tone);

  return (
    <div
      aria-live={banner.tone === 'disconnected' ? 'assertive' : 'polite'}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${config.containerClass}`}
      role={banner.tone === 'disconnected' ? 'alert' : 'status'}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <config.Icon className={config.iconClass} size={16} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/88">{config.title}</p>
          <p className="text-xs text-white/58">
            {config.message}
            {showElapsed ? ` ${elapsedLabel}.` : ''}
          </p>
        </div>
      </div>
      {banner.tone === 'disconnected' && onReconnectNow ? (
        <button
          className="interactive-focus-ring mobile-touch-target flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-black/15 px-3 text-xs font-semibold text-white/85"
          onClick={onReconnectNow}
          type="button"
        >
          <RefreshCcw size={13} />
          <span>Reconnect now</span>
        </button>
      ) : null}
      <button
        aria-label="Dismiss connection status"
        className="interactive-focus-ring mobile-touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/15 text-white/55"
        onClick={() => setDismissedBannerKey(bannerKey)}
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function formatElapsedLabel(elapsedMs: number) {
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  if (minutes === 0) {
    return `Disconnected for ${seconds}s`;
  }

  return `Disconnected for ${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function getBannerConfig(tone: BannerTone) {
  if (tone === 'connected') {
    return {
      Icon: CheckCircle2,
      containerClass: 'border-emerald-400/20 bg-emerald-400/[0.09]',
      iconClass: 'text-emerald-300',
      message: 'The live session recovered.',
      title: 'Reconnected',
    };
  }

  if (tone === 'reconnecting') {
    return {
      Icon: RefreshCcw,
      containerClass: 'border-amber-400/20 bg-amber-400/[0.09]',
      iconClass: 'animate-spin text-amber-300 motion-reduce:animate-none',
      message: 'Trying to restore the live session.',
      title: 'Reconnecting',
    };
  }

  return {
    Icon: WifiOff,
    containerClass: 'border-red-400/20 bg-red-400/[0.09]',
    iconClass: 'text-red-300',
    message: 'The live session dropped and will retry shortly.',
    title: 'Connection lost',
  };
}
