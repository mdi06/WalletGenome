import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-[1400px] items-center p-4 sm:p-6 lg:p-8">
      <section
        aria-labelledby="not-found-title"
        className="mx-auto w-full max-w-2xl border-2 border-[#0a0a0a] bg-white p-5 shadow-[4px_4px_0_#0a0a0a] sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c8c8c8] pb-4">
          <span className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">
            WALLET<span className="text-[#ff5500]">.</span>GENOME
          </span>
          <span className="font-mono text-xs font-bold tracking-wider text-[#963300]">404 / NOT FOUND</span>
        </div>

        <div className="space-y-3 pt-6">
          <h1 id="not-found-title" className="text-2xl font-black tracking-tight text-[#0a0a0a] sm:text-4xl">
            This page could not be found.
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-[#4b5563] sm:text-base">
            The requested route is not part of the WalletGenome evidence workspace. Return to the scanner or review the methodology to continue.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="btn-3d-black inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-white"
          >
            <Search size={15} aria-hidden="true" />
            Return to scanner
          </Link>
          <Link
            href="/docs"
            className="btn-3d-neutral inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0a0a0a]"
          >
            <BookOpen size={15} aria-hidden="true" />
            Read methodology
          </Link>
        </div>
      </section>
    </main>
  );
}
