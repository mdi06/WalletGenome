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
      // Font families are selected in src/app/fonts.ts.
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
};

export default config;
