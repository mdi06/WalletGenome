'use client';

import React from 'react';
import { WalletIdentityReport, SocialLinkItem } from '@/lib/types';
import { ExternalLink, Globe, User, MessageSquare, Send, Code2, Link2 } from 'lucide-react';

interface Props {
  identity?: WalletIdentityReport;
  address: string;
}

export default function IdentityCard({ identity, address }: Props) {
  if (!identity || !identity.hasIdentity) {
    return (
      <div className="glass-card animate-fade-in-up" style={styles.emptyContainer}>
        <div style={styles.emptyIconBox}>
          <User size={18} color="var(--text-tertiary)" />
        </div>
        <div style={styles.emptyText}>
          <span style={styles.emptyTitle}>Public Identity & Social Links</span>
          <span style={styles.emptySub}>No public ENS, Farcaster, Lens, or Web2 accounts linked to this address.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in-up" style={styles.container}>
      {/* Top Profile Header */}
      <div style={styles.profileRow}>
        <div style={styles.avatarBox}>
          {identity.primaryAvatar ? (
            <img
              src={identity.primaryAvatar}
              alt={identity.primaryName || address}
              style={styles.avatarImg}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div style={styles.avatarFallback}>
              <User size={22} color="var(--accent-indigo)" />
            </div>
          )}
        </div>

        <div style={styles.profileInfo}>
          <div style={styles.nameRow}>
            <h3 style={styles.primaryName}>{identity.primaryName || `${address.slice(0, 6)}...${address.slice(-4)}`}</h3>
            {identity.domains.map((d, i) => (
              <span key={i} style={styles.domainBadge}>
                {formatPlatform(d.platform)}: {d.identity}
              </span>
            ))}
          </div>
          {identity.description && (
            <p style={styles.description}>{identity.description}</p>
          )}
        </div>
      </div>

      {/* Social Chips Grid */}
      {identity.socials.length > 0 && (
        <div style={styles.socialsGrid}>
          {identity.socials.map((s, i) => (
            <SocialChip key={`${s.platform}-${s.handle}-${i}`} social={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SocialChip({ social }: { social: SocialLinkItem }) {
  const icon = getSocialIcon(social.platform);
  const color = getSocialColor(social.platform);

  return (
    <a
      href={social.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...styles.chip,
        borderColor: `${color}40`,
        background: `${color}12`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', color }}>{icon}</span>
      <span style={styles.chipPlatform}>{formatPlatform(social.platform)}:</span>
      <span style={{ ...styles.chipHandle, color }}>{social.handle}</span>
      <ExternalLink size={11} color="var(--text-tertiary)" style={{ marginLeft: 2 }} />
    </a>
  );
}

function getSocialIcon(platform: SocialLinkItem['platform']) {
  switch (platform) {
    case 'twitter':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'github':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      );
    case 'discord':
      return <MessageSquare size={13} />;
    case 'telegram':
      return <Send size={13} />;
    case 'farcaster':
      return <Link2 size={13} />;
    case 'lens':
      return <Globe size={13} />;
    case 'website':
      return <Globe size={13} />;
    default:
      return <User size={13} />;
  }
}

function getSocialColor(platform: SocialLinkItem['platform']): string {
  switch (platform) {
    case 'twitter': return '#1d9bf0';
    case 'discord': return '#5865F2';
    case 'github': return '#e6edf3';
    case 'telegram': return '#229ED9';
    case 'farcaster': return '#8a63d2';
    case 'lens': return '#72df7a';
    case 'website': return 'var(--accent-indigo)';
    default: return 'var(--text-secondary)';
  }
}

function formatPlatform(p: string): string {
  switch (p.toLowerCase()) {
    case 'ens': return 'ENS';
    case 'farcaster': return 'Farcaster';
    case 'lens': return 'Lens';
    case 'basenames': return 'Base';
    case 'twitter': return 'X / Twitter';
    case 'discord': return 'Discord';
    case 'github': return 'GitHub';
    case 'telegram': return 'Telegram';
    case 'website': return 'Web';
    default: return p;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    flexShrink: 0,
    background: 'var(--bg-tertiary)',
    border: '2px solid var(--accent-indigo)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent-indigo-dim)',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
  },
  primaryName: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
  },
  domainBadge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
  },
  description: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  socialsGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap' as const,
    paddingTop: 6,
    borderTop: '1px solid var(--border-primary)',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: '0.75rem',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
  },
  chipPlatform: {
    color: 'var(--text-tertiary)',
    fontSize: '0.68rem',
    fontWeight: 500,
  },
  chipHandle: {
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  emptyContainer: {
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  emptyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  emptyTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  emptySub: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
};
