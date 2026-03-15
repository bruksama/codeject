/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'SF Pro Display',
          'DM Sans',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6',
          muted: 'rgba(124,58,237,0.15)',
        },
        surface: {
          base: '#08080f',
          card: 'rgba(255,255,255,0.04)',
          elevated: 'rgba(255,255,255,0.08)',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'fade-in': 'fade-in 0.25s ease forwards',
        'slide-up': 'slide-up 0.3s ease forwards',
        'scale-in': 'scale-in 0.2s ease forwards',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 44px)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
