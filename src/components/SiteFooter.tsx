import Link from 'next/link';
import { SEO_LANDING_PAGES } from '@/lib/seo';

export default function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1400px] px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-t border-[#c8c8c8] pt-5 text-xs text-[#4b5563] md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-1">
          <p className="font-black uppercase tracking-wider text-[#0a0a0a]">WalletGenome</p>
          <p>Read-only, evidence-aware EVM wallet analytics. No wallet connection or signature required.</p>
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
