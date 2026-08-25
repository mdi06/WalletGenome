import Link from 'next/link';
import { SEO_LANDING_PAGES } from '@/lib/seo';

export default function SiteFooter() {
  return (
    <footer className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4">
      <div className="border-t border-[#c8c8c8] pt-5 flex flex-col gap-4 text-xs text-[#4b5563] sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-1">
          <p className="font-black uppercase tracking-wider text-[#0a0a0a]">WalletGenome</p>
          <p>Read-only, evidence-aware EVM wallet analytics. No wallet connection or signature required.</p>
        </div>
        <nav aria-label="Wallet analytics topics" className="flex max-w-3xl flex-wrap gap-x-4 gap-y-2 sm:justify-end">
          <Link href="/docs" className="font-bold text-[#0a0a0a] hover:text-[#ff5500]">
            Methodology
          </Link>
          {SEO_LANDING_PAGES.map(page => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="font-bold text-[#0a0a0a] hover:text-[#ff5500]"
            >
              {page.title}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
