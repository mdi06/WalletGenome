import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // DESIGN.md defines the current light/orange theme. Shared color and
      // surface tokens live in src/app/globals.css; do not add a second palette.
      // Preserve existing font utilities here; font cleanup is a separate change.
      fontFamily: {
        mono: ['var(--font-space-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
        display: ['var(--font-share-tech)', 'Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
