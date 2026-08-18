import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        telemetry: {
          bg: '#0a0c12',
          chassis: '#151720',
          module: '#1a1c26',
          border: '#282c3b',
          'border-light': '#363c4e',
          ochre: '#e2b868',
          sage: '#9fc499',
          'sage-track': '#192218',
          amber: '#ff8c00',
          'amber-glow': 'rgba(255, 140, 0, 0.25)',
          red: '#f87171',
          tape: '#faf6ee',
          'tape-text': '#1b1d24',
          'grid-red': '#261215',
        },
      },
      fontFamily: {
        mono: ['var(--font-space-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
        display: ['var(--font-share-tech)', 'Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
