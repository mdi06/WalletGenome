'use client';

import React from 'react';
import { WalletIdentityReport, SocialLinkItem } from '@/lib/types';
import { ExternalLink, Globe, User, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface Props {
  identity?: WalletIdentityReport;
  address: string;
}

export default function IdentityCard({ identity, address }: Props) {
  const hasSocials = identity && identity.socials && identity.socials.length > 0;
  const hasDomains = identity && identity.domains && identity.domains.length > 0;

  return (
    <div className="card-3d p-5 text-[#0a0a0a] space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 btn-3d-orange flex items-center justify-center text-white font-black flex-shrink-0 overflow-hidden">
            {identity?.primaryAvatar ? (
              <img
                src={identity.primaryAvatar}
                alt={identity.primaryName || address}
                width={48}
                height={48}
                // @ts-ignore
                fetchPriority="high"
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

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-[#0a0a0a] tracking-tight">
                {identity?.primaryName ? identity.primaryName : `${address.slice(0, 6)}...${address.slice(-4)}`}
              </h3>
              {hasDomains && identity.domains.map((d, i) => (
                <span key={i} className="btn-3d-black text-[10px] font-mono font-bold px-2 py-0.5 text-white">
                  {d.platform.toUpperCase()}: {d.identity}
                </span>
              ))}
            </div>
            {identity?.description ? (
              <p className="text-xs text-[#4b5563] line-clamp-1">{identity.description}</p>
            ) : (
              <p className="text-xs text-[#4b5563]">Universal Web3 & Web2 Social Identity Graph</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasSocials ? (
            <span className="badge-3d text-[11px] font-mono font-bold px-3 py-1 bg-[#059669]/15 text-[#047857] border border-[#059669]/40 flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              <span>{identity.socials.length} CONNECTED SERVICES</span>
            </span>
          ) : (
            <span className="badge-3d text-[11px] font-mono font-bold px-3 py-1 bg-[#dcdcdc] text-[#4b5563] border border-[#c4c4c4]">
              NO SOCIALS ATTACHED
            </span>
          )}
        </div>
      </div>

      {/* Connected Services Badges Grid */}
      {hasSocials ? (
        <div className="space-y-2 pt-2 border-t border-[#c8c8c8]">
          <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            CONNECTED SOCIAL SERVICES & ACCOUNTS:
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {identity.socials.map((s, i) => (
              <SocialServiceBadge key={`${s.platform}-${s.handle}-${i}`} social={s} />
            ))}
          </div>
        </div>
      ) : (
        <div className="well-recessed-light p-3 text-xs text-[#4b5563] font-medium">
          No public Twitter/X, Discord, GitHub, Farcaster, or Lens profiles linked to this address.
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
      className="btn-3d-neutral inline-flex items-center gap-2 px-3 py-1.5 text-[#0a0a0a] text-xs font-bold group cursor-pointer"
    >
      <span className="text-[#ff5500] group-hover:text-black">{icon}</span>
      <span className="text-[#4b5563] group-hover:text-black text-[10px] uppercase font-semibold">
        {serviceName}:
      </span>
      <span className="font-mono font-black">{social.handle}</span>
      <ExternalLink size={11} className="text-[#6b7280] group-hover:text-black ml-0.5" />
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
