'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Session } from '@/types';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import { useAppStore } from '@/stores/useAppStore';

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

export default function SessionCard({ session, onDelete }: SessionCardProps) {
  const router = useRouter();
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.touches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.touches[0].clientY);
    if (dy > 10 && !isSwiping) return;
    if (dx > 0) {
      setIsSwiping(true);
      setSwipeX(Math.min(dx, MAX_SWIPE));
    }
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

  return (
    <div
      className={`swipe-card-container mb-3 transition-all duration-350 ${
        isDeleting ? 'opacity-0 max-h-0 mb-0 overflow-hidden' : 'opacity-100 max-h-[200px]'
      }`}
      style={{ transition: isDeleting ? 'all 0.35s ease' : undefined }}
    >
      {/* Delete background */}
      <div
        className="absolute inset-0 delete-reveal flex items-center justify-end pr-5 rounded-2xl"
        aria-hidden="true"
        style={{ opacity: swipeX > 0 ? Math.min(swipeX / SWIPE_THRESHOLD, 1) : 0 }}
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={20} className="text-white" />
          <span className="text-white text-xs font-medium">Delete</span>
        </div>
      </div>

      {/* Card */}
      <div
        className="glass-card rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform duration-100"
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
          if (e.key === 'Enter') handleOpen();
        }}
      >
        <button
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-white/55 transition hover:bg-red-500/15 hover:text-red-300"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
          aria-label={`Delete session ${session.name}`}
          type="button"
        >
          <Trash2 size={15} />
        </button>

        <div className="flex items-start gap-3">
          {/* Program icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            <span>{session.cliProgram.icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white/90 truncate">{session.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ConnectionBadge status={session.status} />
                <span className="text-[11px] text-white/30">{relativeTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-medium text-purple-400/70 truncate">
                {session.cliProgram.name}
              </span>
              <span className="text-white/20 text-[10px]">•</span>
              <span className="text-[11px] text-white/35 truncate font-mono">
                {session.workspacePath}
              </span>
            </div>

            <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{preview}</p>
          </div>
        </div>

        {/* Message count + delete button (on swipe) */}
        {swipeX > 30 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            aria-label="Delete session"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}
