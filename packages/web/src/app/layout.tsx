import type { Metadata, Viewport } from 'next';
import '@/styles/tailwind.css';
import { Toaster } from 'sonner';

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
      </head>
      <body style={{ background: '#08080f' }}>
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
              fontSize: '14px',
            },
          }}
          offset={{ bottom: 100 }}
        />
      </body>
    </html>
  );
}
