import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f13',
          card: '#18181f',
          hover: '#1f1f28',
          border: '#2a2a36',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a855f7',
          muted: '#4c1d95',
        },
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
        tabbar: 'calc(3.5rem + env(safe-area-inset-bottom))',
      },
      height: {
        tabbar: 'calc(3.5rem + env(safe-area-inset-bottom))',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
} satisfies Config
