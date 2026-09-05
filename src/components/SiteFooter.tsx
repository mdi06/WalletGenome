import Link from 'next/link';
import { SEO_LANDING_PAGES } from '@/lib/seo';

export default function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 border-t border-[#c8c8c8] pt-5 text-xs text-[#4b5563] md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <p className="font-black uppercase tracking-wider text-[#0a0a0a]">WalletGenome</p>
          <p>Read-only, evidence-aware EVM wallet analytics. No wallet connection or signature required.</p>
          <a
            href="https://x.com/wallet_genome"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WalletGenome on X"
            className="inline-flex min-h-11 items-center gap-2 font-bold text-[#0a0a0a] hover:text-orange-ink md:min-h-9"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>@wallet_genome</span>
          </a>
        </div>
        <nav aria-label="Wallet analytics topics" className="flex w-full flex-col items-start gap-2 md:w-auto md:max-w-3xl md:flex-row md:flex-wrap md:justify-end md:gap-x-4 md:gap-y-2">
          <Link href="/docs" className="inline-flex min-h-11 w-full items-center justify-start font-bold text-[#0a0a0a] hover:text-orange-ink md:min-h-9 md:w-auto">
            Methodology
          </Link>
          {SEO_LANDING_PAGES.map(page => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="inline-flex min-h-11 w-full items-center justify-start font-bold text-[#0a0a0a] hover:text-orange-ink md:min-h-9 md:w-auto"
            >
              {page.title}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
