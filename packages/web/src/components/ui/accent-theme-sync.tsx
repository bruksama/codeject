'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export default function AccentThemeSync() {
  const accentColor = useAppStore((state) => state.settings.accentColor);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-primary', accentColor);
    root.style.setProperty('--accent-secondary', accentColor);
    root.style.setProperty('--accent-glow', hexToRgba(accentColor, 0.34));
  }, [accentColor]);

  return null;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return `rgba(124, 58, 237, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
