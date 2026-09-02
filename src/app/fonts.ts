// EDIT FONT CHOICES HERE. Keep the aliases and options below unchanged.
// Main: Inter, Space_Grotesk, Geist, or Outfit. Mono: JetBrains_Mono, Geist_Mono, etc.
import { Inter as MainFont, JetBrains_Mono as MonoFont } from 'next/font/google';

export const mainFont = MainFont({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-main',
});

export const monoFont = MonoFont({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-code',
});
