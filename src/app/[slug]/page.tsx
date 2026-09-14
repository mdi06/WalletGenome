import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd, { type JsonLdObject } from '@/components/JsonLd';
import {
  buildLandingStructuredData,
  buildPageMetadata,
  getSeoLandingPage,
  SEO_LANDING_PAGES,
} from '@/lib/seo';
import SiteHeader from '@/components/SiteHeader';

// Keep the known SEO pages statically generated, but let unknown slugs reach
// the explicit notFound() branch below. With dynamicParams=false, Next.js
// 16.3.1 bubbles its internal NoFallbackError for an ordinary unknown URL.
export const dynamicParams = true;

interface LandingPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SEO_LANDING_PAGES.map(page => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);
  return page ? buildPageMetadata(page) : {};
}

export default async function SeoLandingPage({ params }: LandingPageProps) {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);
  if (!page) notFound();

  const pageJsonLd: JsonLdObject[] = buildLandingStructuredData(page);
  const relatedPages = page.relatedSlugs
    .map(slug => getSeoLandingPage(slug))
    .filter((item): item is typeof page => Boolean(item));

  return (
    <main className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <JsonLd data={pageJsonLd} />

      <SiteHeader activePage="" />

      <article className="space-y-8">
        <section className="well-recessed-light p-6 sm:p-10 space-y-5">
          <p className="text-xs font-mono font-black tracking-wider text-orange-ink">{page.eyebrow}</p>
          <h1 className="max-w-4xl text-3xl sm:text-5xl font-black uppercase tracking-tight leading-tight text-[#0a0a0a]">
            {page.heading}
          </h1>
          <p className="max-w-3xl text-sm sm:text-base leading-relaxed font-medium text-[#374151]">
            {page.intro}
          </p>
          <p className="max-w-3xl border-l-2 border-[#ff5500] pl-3 text-xs leading-relaxed text-[#4b5563]">
            {page.scopeNote}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className="btn-3d-orange inline-flex min-h-11 items-center px-5 py-2.5 text-xs font-black text-[#0a0a0a]">
              OPEN WALLET SCANNER
            </Link>
            <Link href="/docs" className="btn-3d-neutral inline-flex min-h-11 items-center px-5 py-2.5 text-xs font-black text-[#0a0a0a]">
              REVIEW THE METHODOLOGY
            </Link>
          </div>
        </section>

        <section aria-labelledby="capabilities-heading" className="space-y-4">
          <h2 id="capabilities-heading" className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a]">
            What the analysis covers
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {page.capabilities.map(capability => (
              <div key={capability.title} className="p-5 space-y-2 border border-[#c8c8c8] bg-white">
                <h3 className="text-sm font-black uppercase text-[#0a0a0a]">{capability.title}</h3>
                <p className="text-xs leading-relaxed text-[#374151]">{capability.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section aria-labelledby="useful-for-heading" className="well-recessed-light p-6 space-y-4">
            <h2 id="useful-for-heading" className="text-lg font-black uppercase text-[#0a0a0a]">Useful for</h2>
            <ul className="space-y-3 text-sm text-[#374151]">
              {page.usefulFor.map(item => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 flex-none bg-[#ff5500]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="limits-heading" className="well-recessed-light p-6 space-y-4">
            <h2 id="limits-heading" className="text-lg font-black uppercase text-[#0a0a0a]">Important limits</h2>
            <ul className="space-y-3 text-sm text-[#374151]">
              {page.limitations.map(item => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 flex-none bg-[#0a0a0a]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading" className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a]">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {page.faqs.map(faq => (
              <details key={faq.question} className="p-5 group border border-[#c8c8c8] bg-white">
                <summary className="cursor-pointer list-none text-sm font-black text-[#0a0a0a]">
                  {faq.question}
                </summary>
                <p className="pt-3 text-sm leading-relaxed text-[#374151]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <aside aria-labelledby="related-heading" className="bg-[#121318] p-6 space-y-4">
          <h2 id="related-heading" className="text-sm font-black uppercase tracking-wider text-white">
            Continue with a focused guide
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedPages.map(item => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="border border-[#4b5563] p-3 text-white hover:border-[#ff5500]"
              >
                <span className="block text-xs font-black uppercase text-white">{item.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#d1d5db]">{item.primaryIntent}</span>
              </Link>
            ))}
          </div>
        </aside>
      </article>
    </main>
  );
}
