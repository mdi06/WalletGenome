import type { Metadata } from "next";
import { Space_Mono, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

const shareTech = Share_Tech_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-share-tech",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WalletGenome — Tactical On-Chain Telemetry & Forensics",
  description: "Tactical multi-chain EVM forensics: Capital flow network graph, Sybil radar, behavioral DNA, and decentralized identity resolution.",
  keywords: "wallet analytics, EVM, ethereum, gas fees, sybil radar, token approvals, blockchain forensics, wallet genome",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${shareTech.variable}`}>
      <body className="bg-telemetry-bg text-gray-200 antialiased font-mono selection:bg-telemetry-amber selection:text-black">
        {children}
      </body>
    </html>
  );
}
