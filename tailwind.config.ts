import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#060B14',
          panel: '#0B1424',
          panel2: '#0F1B2E',
          panel3: '#132238',
          border: '#1C2E4A',
          muted: '#8194AE',
          text: '#E6EDF7',
          accent: '#22D3EE',
          accentDim: '#0E7490',
          purple: '#8B5CF6',
          critical: '#F43F5E',
          high: '#F97316',
          medium: '#FACC15',
          low: '#22C55E',
          info: '#38BDF8',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(34,211,238,0.06), 0 8px 24px -12px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(34,211,238,0.35), 0 0 20px -4px rgba(34,211,238,0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
