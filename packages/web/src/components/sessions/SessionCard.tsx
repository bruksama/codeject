'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import ProgramIcon from '@/components/ui/program-icon';
import { Session } from '@/types';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import { useAppStore } from '@/stores/useAppStore';
import { selectSetActiveSession } from '@/stores/use-app-store-selectors';

interface SessionCardProps {
  session: Session;
  onDelete: (id: string) => void;
}

function formatRelativeTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getSessionPreview(session: Session): string {
  if (session.terminal?.sessionName) {
    return `Persistent terminal via ${session.terminal.sessionName}`;
  }
  if (session.status === 'starting') {
    return 'Preparing terminal runtime';
  }
  if (session.status === 'connected') {
    return 'Terminal connected';
  }
  if (session.status === 'disconnected') {
    return 'Terminal disconnected';
  }
  if (session.status === 'error') {
    return 'Terminal error';
  }
  return 'Ready to start terminal';
}

function getSessionCardConnectionStatus(session: Session) {
  if (session.status === 'connected') {
    return 'connected' as const;
  }

  if (session.status === 'connecting' || session.status === 'starting') {
    return 'starting' as const;
  }

  if (session.status === 'error') {
    return 'error' as const;
  }

  return 'disconnected' as const;
}

export default function SessionCard({ session, onDelete }: SessionCardProps) {
  const router = useRouter();
  const setActiveSession = useAppStore(selectSetActiveSession);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeStartX = useRef(0);
  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 90;

  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const relativeTime = formatRelativeTime(session.lastMessageAt);
  void clockTick;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeStartX.current = swipeX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.touches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.touches[0].clientY);
    if (dy > 10 && !isSwiping) return;
    setIsSwiping(true);
    setSwipeX(Math.max(0, Math.min(swipeStartX.current + dx, MAX_SWIPE)));
  };

  const handleTouchEnd = () => {
    if (swipeX >= SWIPE_THRESHOLD) {
      setSwipeX(MAX_SWIPE);
    } else {
      setSwipeX(0);
    }
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(session.id), 350);
  };

  const handleOpen = () => {
    if (swipeX > 5) {
      setSwipeX(0);
      return;
    }
    setActiveSession(session.id);
    router.push('/chat-interface');
  };

  const preview = getSessionPreview(session);
  const connectionStatus = getSessionCardConnectionStatus(session);

  return (
    <div
      className={`swipe-card-container content-auto-card mb-3 transition-all duration-350 ${
        isDeleting ? 'opacity-0 max-h-0 mb-0 overflow-hidden' : 'opacity-100 max-h-[200px]'
      }`}
      style={{ transition: isDeleting ? 'all 0.35s ease' : undefined }}
    >
      {/* Delete background */}
      <button
        className="absolute inset-0 delete-reveal interactive-focus-ring flex items-center justify-end rounded-2xl pr-5"
        aria-label={`Delete session ${session.name}`}
        onClick={(event) => {
          event.stopPropagation();
          if (swipeX >= SWIPE_THRESHOLD) {
            handleDelete();
          }
        }}
        style={{
          opacity: swipeX > 0 ? Math.min(swipeX / SWIPE_THRESHOLD, 1) : 0,
          pointerEvents: swipeX >= SWIPE_THRESHOLD ? 'auto' : 'none',
        }}
        type="button"
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={20} className="text-white" />
          <span className="text-white text-xs font-medium">Delete</span>
        </div>
      </button>

      {/* Card */}
      <div
        className="glass-card interactive-focus-ring rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform duration-100"
        style={{
          transform: `translateX(-${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        onClick={swipeX < 5 ? handleOpen : () => setSwipeX(0)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        aria-label={`Open session ${session.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
      >
        <div className="flex items-start gap-3">
          {/* Program icon */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)',
            }}
          >
            <ProgramIcon alt={session.cliProgram.name} icon={session.cliProgram.icon} size={22} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white/90 truncate">{session.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ConnectionBadge size="md" status={connectionStatus} />
                <span className="text-[0.6875rem] text-white/45">{relativeTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="accent-text truncate text-[0.6875rem] font-medium opacity-90">
                {session.cliProgram.name}
              </span>
              <span className="text-white/20 text-[0.625rem]">•</span>
              <span className="text-[0.6875rem] text-white/45 truncate font-mono">
                {session.workspacePath}
              </span>
            </div>

            <p className="text-sm text-white/55 leading-6 line-clamp-2">{preview}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
