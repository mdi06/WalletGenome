import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import SiteHeader from '@/components/SiteHeader';
import {
  buildGuideStructuredData,
  GUIDES_CONTENT_LAST_REVIEWED,
  type GuideBlock,
  type GuidePage,
  type GuideTextPart,
} from '@/lib/guides';

function RichText({ content }: { content: readonly GuideTextPart[] }) {
  return content.map((part, index) => (
    typeof part === 'string' ? part : (
      <Link
        key={`${part.href}-${index}`}
        href={part.href}
        className="font-bold text-orange-ink underline decoration-[#ff5500]/40 underline-offset-4 hover:decoration-[#ff5500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#963300]"
      >
        {part.text}
      </Link>
    )
  ));
}

function OrangeBullet({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`h-2 w-2 shrink-0 bg-[#ff5500] ${className}`}
    />
  );
}

function GuideBlockView({ block }: { block: GuideBlock }) {
  if (block.type === 'paragraph') {
    return <p><RichText content={block.content} /></p>;
  }

  if (block.type === 'list') {
    return (
      <ul className="space-y-3">
        {block.items.map((item, index) => (
          <li key={index} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <OrangeBullet className="mt-[0.65em]" />
            <span><RichText content={item} /></span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === 'steps') {
    return (
      <ol className="border-t border-[#c8c8c8]">
        {block.items.map(item => (
          <li key={item.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-[#c8c8c8] py-5 sm:gap-5">
            <OrangeBullet className="mt-[0.45em]" />
            <div className="space-y-2">
              <h3 className="text-base font-black text-[#0a0a0a]">{item.title}</h3>
              <p><RichText content={item.body} /></p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <aside className="border-l-4 border-[#ff5500] bg-[#fff7f2] p-5 sm:p-6">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-orange-ink">
        {block.label}
      </p>
      <p className="mt-2 font-semibold text-[#1f2937]"><RichText content={block.content} /></p>
    </aside>
  );
}

function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function GuideArticle({ guide }: { guide: GuidePage }) {
  return (
    <main className="mx-auto max-w-[1120px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <JsonLd data={buildGuideStructuredData(guide)} />
      <SiteHeader activePage="guides" />

      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 border-b border-[#c8c8c8] pb-3 text-xs font-bold text-[#4b5563]">
        <Link href="/" className="hover:text-orange-ink">Scanner</Link>
        <span aria-hidden="true">/</span>
        <Link href="/guides" className="hover:text-orange-ink">Guides</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-[#0a0a0a]">{guide.title}</span>
      </nav>

      <article className="space-y-10">
        <header className="well-recessed-light space-y-5 p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-orange-ink">
              {guide.eyebrow}
            </p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
              Content reviewed {formatReviewDate(GUIDES_CONTENT_LAST_REVIEWED)}
            </p>
          </div>
          <h1 className="max-w-4xl text-balance text-3xl font-black uppercase leading-tight tracking-tight text-[#0a0a0a] sm:text-5xl">
            {guide.heading}
          </h1>
          <p className="max-w-3xl text-pretty text-base font-medium leading-relaxed text-[#374151] sm:text-lg">
            {guide.summary}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/" className="btn-3d-orange inline-flex min-h-11 items-center px-5 py-2.5 text-xs font-black uppercase text-[#0a0a0a]">
              Open wallet scanner
            </Link>
            <Link href="/docs" className="btn-3d-neutral inline-flex min-h-11 items-center px-5 py-2.5 text-xs font-black uppercase text-[#0a0a0a]">
              Review methodology
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
          <aside aria-label="Guide contents" className="border border-[#c8c8c8] bg-white p-5 lg:order-2 lg:sticky lg:top-5">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-orange-ink">In this guide</p>
            <ul className="mt-4 space-y-3 text-xs font-bold leading-relaxed text-[#374151]">
              {guide.sections.map(section => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 hover:text-orange-ink">
                    <OrangeBullet className="mt-[0.45em]" />
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-12 lg:order-1">
            {guide.sections.map(section => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-6 space-y-5">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 border-b-2 border-[#0a0a0a] pb-3 sm:gap-5">
                  <OrangeBullet className="mt-[0.65em] sm:mt-[0.8em]" />
                  <h2 id={`${section.id}-heading`} className="text-2xl font-black uppercase leading-tight tracking-tight text-[#0a0a0a] sm:text-3xl">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-5 text-[0.98rem] leading-7 text-[#374151] sm:text-base sm:leading-8">
                  {section.blocks.map((block, blockIndex) => (
                    <GuideBlockView key={`${section.id}-${blockIndex}`} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <section aria-labelledby="guide-resources-heading" className="space-y-4 border-t-2 border-[#0a0a0a] pt-6">
          <h2 id="guide-resources-heading" className="text-xl font-black uppercase text-[#0a0a0a]">Related evidence and methodology</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {guide.resources.map(resource => (
              <Link key={resource.href} href={resource.href} className="group border border-[#c8c8c8] bg-white p-5 hover:border-[#963300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#963300]">
                <span className="flex items-center justify-between gap-3 text-sm font-black text-[#0a0a0a]">
                  {resource.title}
                  <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-orange-ink transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-[#4b5563]">{resource.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <aside aria-labelledby="guide-cta-heading" className="bg-[#121318] p-6 text-white sm:p-8">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#ff8a50]">{guide.cta.eyebrow}</p>
          <h2 id="guide-cta-heading" className="mt-3 max-w-3xl text-2xl font-black uppercase leading-tight sm:text-3xl">{guide.cta.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d1d5db]">{guide.cta.description}</p>
          <Link href="/" className="btn-3d-orange mt-5 inline-flex min-h-11 items-center gap-2 px-5 py-2.5 text-xs font-black uppercase text-[#0a0a0a]">
            {guide.cta.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </article>
    </main>
  );
}
