import type { Metadata } from "next";
// Both app-wide font choices live in ./fonts.ts.
import { mainFont, monoFont } from "./fonts";
import JsonLd, { type JsonLdObject } from "@/components/JsonLd";
import SiteFooter from "@/components/SiteFooter";
import { absoluteUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { WebVitals } from "@/components/WebVitals";
import VercelAnalytics from "@/components/VercelAnalytics";
import BackgroundNodes from "@/components/BackgroundNodes";
import CursorGlow from "@/components/CursorGlow";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthDialogProvider } from "@/components/auth/AuthDialogProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "WalletGenome — EVM Wallet Analytics & Forensics",
    template: "%s | WalletGenome",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "wallet analytics",
    "EVM wallet analytics",
    "Ethereum wallet analysis",
    "crypto wallet risk checker",
    "token approval checker",
    "Sybil wallet analysis",
    "blockchain forensics",
  ],
  alternates: { canonical: "/" },
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: "WalletGenome — EVM Wallet Analytics & Forensics",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "WalletGenome — EVM Wallet Analytics & Forensics",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const applicationJsonLd: JsonLdObject = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": absoluteUrl("/#application"),
  name: SITE_NAME,
  url: absoluteUrl("/"),
  description: SITE_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "Blockchain analytics",
  operatingSystem: "Web browser",
  browserRequirements: "Requires a modern web browser with JavaScript enabled for interactive scans.",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: 0,
    priceCurrency: "USD",
  },
  featureList: [
    "Multi-chain EVM wallet analytics",
    "Behavioral fingerprinting",
    "Token approval review",
    "Capital-flow visualization",
    "Risk and Sybil signal reporting",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mainFont.variable} ${monoFont.variable}`}>
      <body className="bg-[#ebebeb] text-[#0a0a0a] antialiased font-sans selection:bg-[#ff5500] selection:text-[#0a0a0a]">
        <AuthProvider>
          <AuthDialogProvider>
            <div data-app-shell>
              <WebVitals />
              <VercelAnalytics />
              <JsonLd data={applicationJsonLd} />
              <BackgroundNodes />
              <CursorGlow />
              {children}
              <SiteFooter />
            </div>
          </AuthDialogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
