'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

const fontSizeScale = {
  small: { size: '15px', scale: '0.9375' },
  medium: { size: '16px', scale: '1' },
  large: { size: '17px', scale: '1.0625' },
} as const;
const defaultFontSizeConfig = fontSizeScale.medium;

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
