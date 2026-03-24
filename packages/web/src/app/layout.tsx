import type { Metadata, Viewport } from 'next';
import '@/styles/tailwind.css';
import { Toaster } from 'sonner';
import AccentThemeSync from '@/components/ui/accent-theme-sync';
import FontSizeThemeSync from '@/components/ui/font-size-theme-sync';
import NotificationPermissionSync from '@/components/ui/notification-permission-sync';
import SkipToContentLink from '@/components/ui/skip-to-content-link';
import { defaultFontSizeConfig, fontSizeScale } from '@/lib/font-size-scale';

const FONT_SIZE_INIT_SCRIPT = `
(() => {
  const root = document.documentElement;
  const fallback = ${JSON.stringify(defaultFontSizeConfig)};
  const scaleMap = ${JSON.stringify(fontSizeScale)};
  const setFontScaleVars = (config) => {
    const scale = Number(config.scale) || 1;
    root.style.setProperty('--app-font-size', config.size);
    root.style.setProperty('--app-font-scale', config.scale);
    root.style.setProperty('--app-bottom-nav-clearance', Math.round(96 * scale) + 'px');
    root.style.setProperty('--session-list-bottom-clearance', Math.round(104 * scale) + 'px');
    root.style.setProperty('--chat-command-menu-clearance', Math.round(320 * scale) + 'px');
  };

  try {
    const raw = window.localStorage.getItem('codeject-storage');
    const parsed = raw ? JSON.parse(raw) : null;
    const fontSize = parsed?.state?.settings?.fontSize;
    const config = scaleMap[fontSize] ?? fallback;
    setFontScaleVars(config);
  } catch {
    setFontScaleVars(fallback);
  }
})();
`;

export const metadata: Metadata = {
  title: 'Codeject',
  description: 'Mobile interface for local CLI coding assistants',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Codeject',
  },
};

export const viewport: Viewport = {
  themeColor: '#08080f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: FONT_SIZE_INIT_SCRIPT }} />
      </head>
      <body style={{ background: '#08080f' }}>
        <AccentThemeSync />
        <FontSizeThemeSync />
        <NotificationPermissionSync />
        <SkipToContentLink />
        <div>{children}</div>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'rgba(15,15,26,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f1f0ff',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              fontSize: '0.875rem',
            },
          }}
          offset={{ bottom: 100 }}
        />
      </body>
    </html>
  );
}
