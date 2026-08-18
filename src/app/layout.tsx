import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallet Analytics — EVM Wallet Forensics",
  description: "Analyze any EVM wallet: track gas fees, find biggest transfers, detect lost funds, audit token approvals, and discover dead assets across Ethereum, Base, and Arbitrum.",
  keywords: "wallet analytics, EVM, ethereum, gas fees, lost crypto, token approvals, blockchain forensics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
