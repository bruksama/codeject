import type { Metadata, Viewport } from 'next';
import '@/styles/tailwind.css';
import { Toaster } from 'sonner';
import AccentThemeSync from '@/components/ui/accent-theme-sync';
import FontSizeThemeSync from '@/components/ui/font-size-theme-sync';

const FONT_SIZE_INIT_SCRIPT = `
(() => {
  const root = document.documentElement;
  const fallback = { size: '16px', scale: '1' };
  const scaleMap = {
    small: { size: '15px', scale: '0.9375' },
    medium: fallback,
    large: { size: '17px', scale: '1.0625' }
  };

  try {
    const raw = window.localStorage.getItem('codeject-storage');
    const parsed = raw ? JSON.parse(raw) : null;
    const fontSize = parsed?.state?.settings?.fontSize;
    const config = scaleMap[fontSize] ?? fallback;
    root.style.setProperty('--app-font-size', config.size);
    root.style.setProperty('--app-font-scale', config.scale);
  } catch {
    root.style.setProperty('--app-font-size', fallback.size);
    root.style.setProperty('--app-font-scale', fallback.scale);
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
  maximumScale: 1,
  userScalable: false,
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
        {children}
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
