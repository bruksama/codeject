'use client';

import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

export default function FloatingActionButton({
  onClick,
  label = 'New session',
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed z-40 accent-gradient accent-glow fab-pulse rounded-full shadow-2xl active:scale-90 transition-transform duration-150"
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        right: '20px',
        width: 56,
        height: 56,
      }}
    >
      <span className="flex items-center justify-center w-full h-full">
        <Plus size={26} className="text-white" strokeWidth={2.5} />
      </span>
    </button>
  );
}
