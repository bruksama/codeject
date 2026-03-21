'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { defaultFontSizeConfig, fontSizeScale } from '@/lib/font-size-scale';

export default function FontSizeThemeSync() {
  const fontSize = useAppStore((state) => state.settings.fontSize);

  useEffect(() => {
    const root = document.documentElement;
    const config = fontSizeScale[fontSize] ?? defaultFontSizeConfig;
    root.style.setProperty('--app-font-size', config.size);
    root.style.setProperty('--app-font-scale', config.scale);
  }, [fontSize]);

  return null;
}
