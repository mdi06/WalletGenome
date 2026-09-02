'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { WalletIdentityReport, SocialLinkItem } from '@/lib/types';
import { ExternalLink, Globe, MessageSquare, Send, CheckCircle2, Copy } from 'lucide-react';

interface Props {
  identity?: WalletIdentityReport;
  address: string;
  persona?: string;
}

export default function IdentityCard({ identity, address, persona }: Props) {
  const hasSocials = identity && identity.socials && identity.socials.length > 0;
  const linkedSocialHandles = new Set(
    (identity?.socials ?? []).map(social => social.handle.replace(/^@/, '').toLowerCase()),
  );
  const standaloneDomains = (identity?.domains ?? []).filter(
    domain => !linkedSocialHandles.has(domain.identity.replace(/^@/, '').toLowerCase()),
  );
  const [copyStatus, setCopyStatus] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsExpanded(window.innerWidth >= 768);
  }, []);

  const copyAddress = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(address);
      setCopyStatus('Wallet address copied');
    } catch {
      setCopyStatus('Unable to copy wallet address');
    }
  };

  return (
    <div className="card-3d p-5 text-[#0a0a0a] space-y-4">
      {/* Identity summary */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="w-14 h-14 btn-3d-orange flex items-center justify-center text-[#0a0a0a] font-black flex-shrink-0 overflow-hidden">
          {identity?.primaryAvatar ? (
            <Image
              src={identity.primaryAvatar}
              alt={identity.primaryName || address}
              width={56}
              height={56}
              unoptimized
              loading="eager"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xl">🪪</span>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div>
            <h3 className="truncate text-lg font-black text-[#0a0a0a] tracking-tight" title={identity?.primaryName || address}>
              {identity?.primaryName ? identity.primaryName : `${address.slice(0, 6)}...${address.slice(-4)}`}
            </h3>
          <div className="flex items-center gap-2 mt-1">
            {persona && (
              <span className="badge-3d bg-black text-white px-2 py-0.5 text-[10px] font-extrabold tracking-widest uppercase">
                {persona}
              </span>
            )}
            <p className="text-xs text-[#4b5563] line-clamp-2">
              {identity?.description ? identity.description : 'Available public Web3 & Web2 identity links'}
            </p>
          </div>
          </div>

          {standaloneDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6b7280]">
                Other resolved names
              </span>
              {standaloneDomains.map(domain => (
                <span
                  key={`${domain.platform}-${domain.identity}`}
                  className="badge-3d bg-[#ececec] px-2 py-1 font-mono text-[10px] font-bold text-[#374151]"
                >
                  {domain.platform}: {domain.identity}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="col-start-2 flex min-w-0 items-center gap-2 sm:col-start-3 sm:row-start-1 sm:self-center sm:justify-self-end">
          <span className="min-w-0 truncate font-mono text-[11px] text-[#6b7280]" title={address}>
            {address}
          </span>
          <button
            type="button"
            aria-label={`Copy wallet address ${address}`}
            title="Copy wallet address"
            onClick={() => void copyAddress()}
            className="btn-3d-neutral inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 flex-shrink-0 items-center justify-center text-[#4b5563]"
          >
            <Copy size={13} aria-hidden="true" />
          </button>
          <span className="sr-only" role="status" aria-live="polite">{copyStatus}</span>
        </div>
      </div>

      {/* Connected accounts */}
      {hasSocials ? (
        <details
          className="group pt-4 border-t border-[#c8c8c8] open:pb-2 [&_svg.chevron]:open:rotate-180"
          open={isExpanded}
          onToggle={(e) => setIsExpanded(e.currentTarget.open)}
        >
          <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#ff5500] p-1 -m-1 list-none [&::-webkit-details-marker]:hidden">
            <h4 className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider group-open:text-[#0a0a0a] flex items-center gap-1.5">
              Connected accounts
              <svg className="chevron w-3 h-3 text-[#6b7280] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </h4>
            <span className="badge-3d text-[11px] font-mono font-bold px-3 py-1 bg-[#059669]/15 text-[#047857] border border-[#059669]/40 flex items-center gap-1.5">
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>{identity.socials.length} services</span>
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 mt-4">
            {identity.socials.map((s, i) => (
              <SocialServiceBadge key={`${s.platform}-${s.handle}-${i}`} social={s} />
            ))}
          </div>
        </details>
      ) : (
        <div className="space-y-2 pt-4 border-t border-[#c8c8c8]">
          <h4 className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            Connected accounts
          </h4>
          <div className="well-recessed-light p-3 text-xs text-[#4b5563] font-medium">
            No public Twitter/X, Discord, GitHub, Farcaster, or Lens profiles linked to this address.
          </div>
        </div>
      )}
    </div>
  );
}

function SocialServiceBadge({ social }: { social: SocialLinkItem }) {
  const icon = getServiceIcon(social.platform);
  const serviceName = formatServiceName(social.platform);

  return (
    <a
      href={social.link}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-3d-neutral inline-flex min-h-11 min-w-0 w-full items-center gap-2 px-3 py-2 text-[#0a0a0a] text-xs font-bold group cursor-pointer"
    >
      <span className="text-orange-ink group-hover:text-black">{icon}</span>
      <span className="text-[#4b5563] group-hover:text-black text-[10px] uppercase font-semibold">
        {serviceName}:
      </span>
      <span className="min-w-0 truncate font-mono font-black" title={social.handle}>{social.handle}</span>
      <ExternalLink size={11} aria-hidden="true" className="ml-auto flex-shrink-0 text-[#6b7280] group-hover:text-black" />
    </a>
  );
}

function getServiceIcon(platform: SocialLinkItem['platform']) {
  switch (platform) {
    case 'twitter':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'github':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      );
    case 'discord': return <MessageSquare size={13} />;
    case 'telegram': return <Send size={13} />;
    case 'lens': return <Globe size={13} />;
    case 'farcaster': return <Globe size={13} />;
    default: return <Globe size={13} />;
  }
}

function formatServiceName(p: string): string {
  switch (p.toLowerCase()) {
    case 'twitter': return 'Twitter / X';
    case 'farcaster': return 'Farcaster';
    case 'lens': return 'Lens';
    case 'github': return 'GitHub';
    case 'discord': return 'Discord';
    case 'telegram': return 'Telegram';
    case 'ens': return 'ENS';
    case 'basenames': return 'Base';
    default: return p;
  }
}
