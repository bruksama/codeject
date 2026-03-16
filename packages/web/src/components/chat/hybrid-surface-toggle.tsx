'use client';

import { MessageSquareText, RectangleEllipsis } from 'lucide-react';
import { type SurfaceMode } from '@/types';

interface HybridSurfaceToggleProps {
  activeMode: SurfaceMode;
  onModeChange: (mode: SurfaceMode) => void;
}

export function HybridSurfaceToggle({ activeMode, onModeChange }: HybridSurfaceToggleProps) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
      <button
        className={`flex items-center gap-2 rounded-[14px] px-3 py-2 text-sm transition ${
          activeMode === 'chat' ? 'bg-white text-[#08080f]' : 'text-white/60'
        }`}
        onClick={() => onModeChange('chat')}
        type="button"
      >
        <MessageSquareText size={16} />
        Chat
      </button>
      <button
        className={`flex items-center gap-2 rounded-[14px] px-3 py-2 text-sm transition ${
          activeMode === 'terminal' ? 'bg-white text-[#08080f]' : 'text-white/60'
        }`}
        onClick={() => onModeChange('terminal')}
        type="button"
      >
        <RectangleEllipsis size={16} />
        Terminal
      </button>
    </div>
  );
}
