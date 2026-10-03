/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#06080d',
          900: '#0b0f17',
          850: '#101622',
          800: '#161f30',
          700: '#222f46',
          600: '#324564',
        },
        emergency: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          glow: 'rgba(239, 68, 68, 0.4)',
        },
        corridor: {
          400: '#4ade80',
          500: '#22c55e',
          glow: 'rgba(34, 197, 94, 0.5)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'siren': 'sirenFlash 0.6s infinite alternate',
      },
      keyframes: {
        sirenFlash: {
          '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 8px #ef4444)' },
          '100%': { transform: 'scale(1.15)', filter: 'drop-shadow(0 0 20px #3b82f6)' }
        }
      }
    },
  },
  plugins: [],
}
