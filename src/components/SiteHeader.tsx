'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Menu, Search, X } from 'lucide-react';
import AuthActions from '@/components/auth/AuthActions';

interface SiteHeaderProps {
  activePage?: 'scanner' | 'docs' | string;
  onBrandClick?: () => void;
  contextAction?: React.ReactNode;
}

function Brand({ onClick }: { onClick?: () => void }) {
  const label = (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
        WALLET<span className="text-[#ff5500]">.</span>GENOME
      </span>
      <span className="border border-[#ff5500] bg-[#fff2eb] px-1 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-orange-ink">Beta</span>
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
  onBrandClick,
  contextAction,
}: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

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
    `btn-3d-black inline-flex min-h-11 w-full items-center justify-start gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-white md:min-h-9 md:w-auto md:py-1 ${
      isActive
        ? 'md:text-white'
        : 'md:text-[#0a0a0a] md:border-[#d9dbe1] md:[background:linear-gradient(180deg,_#ffffff_0%,_#f0f1f5_100%)] md:[box-shadow:var(--shadow-btn-neutral)] md:[transition:transform_0.12s_var(--ease-spring),_box-shadow_0.12s_ease,_background-color_0.12s_ease,_border-color_0.12s_ease] md:hover:border-[#b8bbc3] md:hover:[background:linear-gradient(180deg,_#ffffff_0%,_#f7f8fa_100%)] md:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),_0_1px_0_#bfc2c9,_0_3px_6px_rgba(0,0,0,0.05)] md:active:border-[#b8bbc3] md:active:[background:#e8e9ee] md:active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),_0_0.5px_0_#bfc2c9]'
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

      <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end md:gap-2">
        <div
          id="primary-navigation-menu"
          data-open={isMenuOpen}
          className={`${isMenuOpen ? 'flex' : 'hidden'} mobile-navigation-disclosure w-full flex-col gap-2 md:flex md:w-auto md:flex-row md:items-center md:gap-2`}
        >
          <AuthActions onSignIn={closeMenu} returnFocusFallbackRef={menuToggleRef} />

          {contextAction && (
            <div className="w-full md:w-auto" onClick={closeMenu}>
              {contextAction}
            </div>
          )}

          <nav aria-label="Primary navigation" className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center" onClick={closeMenu}>
            <Link
              href="/"
              aria-current={activePage === 'scanner' ? 'page' : undefined}
              className={navItemClassName(activePage === 'scanner')}
            >
              <Search size={13} className="text-[#ff5500] md:text-orange-ink" aria-hidden="true" />
              <span>Scanner</span>
            </Link>
            <Link
              href="/docs"
              aria-current={activePage === 'docs' ? 'page' : undefined}
              className={navItemClassName(activePage === 'docs')}
            >
              <BookOpen size={13} className="text-[#ff5500] md:text-orange-ink" aria-hidden="true" />
              {activePage === 'docs' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5500] md:hidden" aria-hidden="true" />}
              <span>Docs / methodology</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
