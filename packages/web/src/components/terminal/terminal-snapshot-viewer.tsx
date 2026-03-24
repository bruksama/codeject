'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';

const BOTTOM_THRESHOLD_PX = 24;

interface TerminalSnapshotViewerProps {
  content: string;
  isActive?: boolean;
  seq: number;
}

export function TerminalSnapshotViewer({
  content,
  isActive = true,
  seq,
}: TerminalSnapshotViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const syncBottomState = () => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowJumpToBottom(distanceFromBottom > BOTTOM_THRESHOLD_PX);
  };

  const scrollToBottom = () => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
    setShowJumpToBottom(false);
  };

  useEffect(() => {
    if (!isActive || showJumpToBottom) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollToBottom();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isActive, seq, showJumpToBottom]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[20px] border border-white/8 bg-[#05050b]">
      <div
        ref={containerRef}
        aria-label="Terminal snapshot"
        className="h-full w-full overflow-auto"
        data-testid="terminal-snapshot-scroller"
        onScroll={syncBottomState}
      >
        <pre className="min-h-full min-w-full px-4 py-3 font-mono text-[0.8rem] leading-5 whitespace-pre text-white/78">
          {content || 'Waiting for terminal output...'}
        </pre>
      </div>
      {showJumpToBottom ? (
        <button
          aria-label="Jump to bottom"
          className="interactive-focus-ring mobile-touch-target absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/85 shadow-[0_16px_36px_rgba(0,0,0,0.38)] transition-colors hover:bg-white/[0.08]"
          onClick={scrollToBottom}
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.14), color-mix(in srgb, var(--accent-primary) 16%, rgba(10,10,18,0.92)))',
          }}
          type="button"
        >
          <ArrowDown size={14} />
          Jump to bottom
        </button>
      ) : null}
    </div>
  );
}
