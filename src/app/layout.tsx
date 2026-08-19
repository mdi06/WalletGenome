import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WalletGenome — Multi-Chain EVM Forensics & Intelligence",
  description: "Advanced on-chain intelligence: Capital flow topology, Sybil radar, behavioral DNA, and decentralized identity resolution.",
  keywords: "wallet analytics, EVM, ethereum, gas fees, sybil radar, token approvals, blockchain forensics, wallet genome",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#ebebeb] text-[#0a0a0a] antialiased font-sans selection:bg-[#ff5500] selection:text-white">
        {children}
      </body>
    </html>
  );
}
