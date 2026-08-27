'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Menu, Search, X } from 'lucide-react';
import type { IndexingStatus } from '@/lib/indexingStatus';

interface SiteHeaderProps {
  activePage?: 'scanner' | 'docs' | string;
  indexingStatus: IndexingStatus;
  showIndexingStatus?: boolean;
  onBrandClick?: () => void;
  contextAction?: React.ReactNode;
}

const STATUS_PRESENTATION: Record<IndexingStatus, {
  label: string;
  dotClassName: string;
  badgeClassName: string;
}> = {
  ready: {
    label: 'Ready',
    dotClassName: 'w-2 h-2 rounded-full bg-[#6b7280]',
    badgeClassName: 'bg-[#e5e5e5] text-[#4b5563]',
  },
  scanning: {
    label: 'Scanning',
    dotClassName: 'led-warn animate-pulse',
    badgeClassName: 'badge-brand-orange',
  },
  completed: {
    label: 'Live scan',
    dotClassName: 'led-live',
    badgeClassName: 'bg-[#ff5500] text-[#0a0a0a]',
  },
  saved: {
    label: 'Saved snapshot',
    dotClassName: 'led-clean',
    badgeClassName: 'bg-[#059669] text-white',
  },
  partial: {
    label: 'Partial data',
    dotClassName: 'led-warn',
    badgeClassName: 'bg-[#f59e0b] text-[#0a0a0a]',
  },
  unavailable: {
    label: 'Unavailable',
    dotClassName: 'h-2 w-2 border border-white/80 bg-[#dc2626] shadow-[0_0_6px_#dc2626]',
    badgeClassName: 'bg-[#dc2626] text-white',
  },
};

function Brand({ onClick }: { onClick?: () => void }) {
  const label = (
    <span className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
      WALLET<span className="text-[#ff5500]">.</span>GENOME
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-11 min-w-0 items-center text-left transition-transform active:scale-95"
        aria-label="Open WalletGenome guide"
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      href="/"
      aria-label="WalletGenome home"
      className="inline-flex min-h-11 min-w-0 items-center text-left"
    >
      {label}
    </Link>
  );
}

export default function SiteHeader({
  activePage,
  indexingStatus,
  showIndexingStatus = true,
  onBrandClick,
  contextAction,
}: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const status = STATUS_PRESENTATION[indexingStatus];

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      setIsMenuOpen(false);
      menuToggleRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const navItemClassName = (isActive: boolean) =>
    `inline-flex min-h-11 md:min-h-9 items-center gap-1.5 px-3 py-1.5 md:py-1 text-xs font-bold uppercase ${
      isActive ? 'btn-3d-black text-white' : 'btn-3d-neutral text-[#0a0a0a]'
    }`;

  return (
    <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center md:gap-4">
      <div className="flex w-full min-w-0 items-center justify-between md:w-auto">
        <Brand onClick={onBrandClick} />

        <button
          ref={menuToggleRef}
          type="button"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          className="btn-3d-neutral inline-flex min-h-11 min-w-11 items-center justify-center md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation-menu"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
        >
          {isMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      <div className={`${!isMenuOpen && !showIndexingStatus ? 'hidden md:flex' : 'flex'} w-full min-w-0 flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end md:gap-2`}>
        {showIndexingStatus && (
          <span
            className={`badge-3d order-first inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${status.badgeClassName} md:order-last md:min-h-9 md:py-1`}
            role="status"
            aria-label={`Indexing status: ${status.label}`}
          >
            <span aria-hidden="true" className={status.dotClassName} />
            <span>{status.label}</span>
          </span>
        )}

        <div
          id="primary-navigation-menu"
          data-open={isMenuOpen}
          className={`${isMenuOpen ? 'flex' : 'hidden'} mobile-navigation-disclosure w-full flex-col gap-2 md:flex md:w-auto md:flex-row md:items-center md:gap-2`}
        >
          {contextAction && (
            <div className="w-full md:w-auto" onClick={closeMenu}>
              {contextAction}
            </div>
          )}

          <nav aria-label="Primary navigation" className="flex flex-col gap-2 md:flex-row md:items-center" onClick={closeMenu}>
            <Link
              href="/"
              aria-current={activePage === 'scanner' ? 'page' : undefined}
              className={navItemClassName(activePage === 'scanner')}
            >
              <Search size={13} className="text-orange-ink" aria-hidden="true" />
              <span>Scanner</span>
            </Link>
            <Link
              href="/docs"
              aria-current={activePage === 'docs' ? 'page' : undefined}
              className={navItemClassName(activePage === 'docs')}
            >
              <BookOpen size={13} className="text-orange-ink" aria-hidden="true" />
              <span>Docs / methodology</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
