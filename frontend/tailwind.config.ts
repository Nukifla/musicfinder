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
    },
  },
  plugins: [],
} satisfies Config
