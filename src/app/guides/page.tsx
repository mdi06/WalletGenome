import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import SiteHeader from '@/components/SiteHeader';
import {
  buildGuideIndexMetadata,
  buildGuideIndexStructuredData,
  GUIDE_INDEX,
  GUIDES,
  GUIDES_CONTENT_LAST_REVIEWED,
} from '@/lib/guides';

export const metadata = buildGuideIndexMetadata();

export default function GuidesPage() {
  return (
    <main className="mx-auto max-w-[1120px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <JsonLd data={buildGuideIndexStructuredData()} />
      <SiteHeader activePage="guides" />

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 border-b border-[#c8c8c8] pb-3 text-xs font-bold text-[#4b5563]">
        <Link href="/" className="hover:text-orange-ink">Scanner</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-[#0a0a0a]">Guides</span>
      </nav>

      <header className="well-recessed-light space-y-5 p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-orange-ink">WALLETGENOME EDITORIAL</p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Reviewed {GUIDES_CONTENT_LAST_REVIEWED}</p>
        </div>
        <h1 className="max-w-4xl text-balance text-3xl font-black uppercase leading-tight tracking-tight text-[#0a0a0a] sm:text-5xl">
          {GUIDE_INDEX.heading}
        </h1>
        <p className="max-w-3xl text-pretty text-base font-medium leading-relaxed text-[#374151] sm:text-lg">
          {GUIDE_INDEX.summary}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/" className="btn-3d-orange inline-flex min-h-11 items-center px-5 py-2.5 text-xs font-black uppercase text-[#0a0a0a]">Open wallet scanner</Link>
          <Link href="/docs" className="btn-3d-neutral inline-flex min-h-11 items-center px-5 py-2.5 text-xs font-black uppercase text-[#0a0a0a]">Read methodology</Link>
        </div>
      </header>

      <section aria-labelledby="guide-collection-heading" className="space-y-4">
        <div className="border-b-2 border-[#0a0a0a] pb-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-orange-ink">CURRENT COLLECTION</p>
          <h2 id="guide-collection-heading" className="mt-2 text-2xl font-black uppercase text-[#0a0a0a] sm:text-3xl">Start with the question you need to answer</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {GUIDES.map((guide, index) => (
            <article key={guide.slug} className="card-3d flex min-h-full flex-col bg-white p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs font-black tracking-[0.18em] text-orange-ink">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6b7280]">Field guide</span>
              </div>
              <h3 className="mt-6 text-2xl font-black uppercase leading-tight text-[#0a0a0a]">{guide.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#4b5563]">{guide.summary}</p>
              <p className="mt-4 border-l-2 border-[#ff5500] pl-3 text-xs leading-relaxed text-[#4b5563]">{guide.primaryIntent}</p>
              <Link href={`/guides/${guide.slug}`} className="group mt-6 inline-flex min-h-11 items-center justify-between gap-3 border-t border-[#c8c8c8] pt-4 text-xs font-black uppercase text-[#0a0a0a] hover:text-orange-ink">
                Read {guide.title}
                <ArrowRight size={15} aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <aside className="grid gap-4 border border-[#c8c8c8] bg-white p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <h2 className="text-lg font-black uppercase text-[#0a0a0a]">Need the implementation details?</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4b5563]">The methodology documents data sources, calculations, completeness rules, and current scoring thresholds.</p>
        </div>
        <Link href="/docs" className="btn-3d-neutral inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-xs font-black uppercase text-[#0a0a0a]">Review the methodology</Link>
      </aside>
    </main>
  );
}
