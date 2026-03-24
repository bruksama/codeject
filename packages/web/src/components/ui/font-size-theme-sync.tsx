'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { defaultFontSizeConfig, fontSizeScale } from '@/lib/font-size-scale';

export default function FontSizeThemeSync() {
  const fontSize = useAppStore((state) => state.settings.fontSize);

  useEffect(() => {
    const root = document.documentElement;
    const config = fontSizeScale[fontSize] ?? defaultFontSizeConfig;
    const scale = Number(config.scale) || 1;
    root.style.setProperty('--app-font-size', config.size);
    root.style.setProperty('--app-font-scale', config.scale);
    root.style.setProperty('--app-bottom-nav-clearance', `${Math.round(96 * scale)}px`);
    root.style.setProperty('--session-list-bottom-clearance', `${Math.round(104 * scale)}px`);
    root.style.setProperty('--chat-command-menu-clearance', `${Math.round(320 * scale)}px`);
  }, [fontSize]);

  return null;
}
