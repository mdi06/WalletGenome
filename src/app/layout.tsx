import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WalletGenome — Multi-Chain EVM Forensics & Intelligence",
  description: "Advanced on-chain intelligence: Capital flow topology, Sybil radar, behavioral DNA, and decentralized identity resolution.",
  keywords: "wallet analytics, EVM, ethereum, gas fees, sybil radar, token approvals, blockchain forensics, wallet genome",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#ebebeb] text-[#0a0a0a] antialiased font-sans selection:bg-[#ff5500] selection:text-white">
        {children}
      </body>
    </html>
  );
}
