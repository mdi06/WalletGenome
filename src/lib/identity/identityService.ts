import { WalletIdentityReport, SocialLinkItem, DomainIdentityItem } from '../types';
import { identityCache, getDomainLimiter } from '../cache';

interface Web3BioProfile {
  platform: string;
  identity: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  links?: Record<string, { link: string; handle?: string }>;
}

function sanitizeHttpUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return null;
}

export async function resolveWalletIdentity(address: string): Promise<WalletIdentityReport> {
  const lower = (address || '').toLowerCase();
  if (!lower || !lower.startsWith('0x')) {
    return getEmptyReport();
  }

  // Check LRU in-memory identity cache
  const cachedReport = identityCache.get(lower);
  if (cachedReport) {
    return cachedReport;
  }

  // Respect API rate limits with Token Bucket
  const limiter = getDomainLimiter('api.web3.bio', 5);
  await limiter.acquire(2000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`https://api.web3.bio/profile/${lower}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Wallet-Analytics-Identity/1.0' },
    });

    if (!res.ok) {
      return getEmptyReport();
    }

    const profiles: Web3BioProfile[] = await res.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      const empty = getEmptyReport();
      identityCache.set(lower, empty, 600); // 10 min cache for empty
      return empty;
    }

    let primaryName: string | null = null;
    let primaryAvatar: string | null = null;
    let description: string | null = null;

    const domains: DomainIdentityItem[] = [];
    const socialMap = new Map<string, SocialLinkItem>();

    // Priority for primary name: ENS > Farcaster > Lens > BaseNames > other
    const platformPriority: Record<string, number> = {
      ens: 10,
      farcaster: 9,
      lens: 8,
      basenames: 7,
      unstoppableDomains: 6,
      dotbit: 5,
    };

    let bestScore = -1;

    for (const p of profiles) {
      const platformKey = p.platform.toLowerCase();
      const score = platformPriority[platformKey] || 1;

      domains.push({
        platform: p.platform,
        identity: p.identity,
        displayName: p.displayName,
      });

      if (score > bestScore) {
        bestScore = score;
        primaryName = p.displayName || p.identity;
      }

      if (p.avatar && !primaryAvatar) {
        primaryAvatar = p.avatar;
      }

      if (p.description && !description) {
        description = p.description;
      }

      // Extract Native Web3 Handle Links
      if (platformKey === 'farcaster') {
        const handle = p.identity || p.displayName || '';
        socialMap.set(`farcaster-${handle.toLowerCase()}`, {
          platform: 'farcaster',
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          link: `https://warpcast.com/${handle.replace('@', '')}`,
        });
      } else if (platformKey === 'lens') {
        const handle = p.identity || p.displayName || '';
        socialMap.set(`lens-${handle.toLowerCase()}`, {
          platform: 'lens',
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          link: `https://hey.xyz/u/${handle.replace('@', '')}`,
        });
      } else if (platformKey === 'ens') {
        socialMap.set(`ens-${p.identity.toLowerCase()}`, {
          platform: 'ens',
          handle: p.identity,
          link: `https://app.ens.domains/${p.identity}`,
        });
      } else if (platformKey === 'basenames') {
        socialMap.set(`basenames-${p.identity.toLowerCase()}`, {
          platform: 'basenames',
          handle: p.identity,
          link: `https://base.org/names?query=${p.identity}`,
        });
      }

      // Extract Web2 & External Links
      if (p.links) {
        for (const [linkKey, linkObj] of Object.entries(p.links)) {
          if (!linkObj || !linkObj.link) continue;
          const sanitizedLink = sanitizeHttpUrl(linkObj.link);
          if (!sanitizedLink) continue;

          const k = linkKey.toLowerCase();
          const handle = linkObj.handle || sanitizedLink.split('/').filter(Boolean).pop() || '';

          let platform: SocialLinkItem['platform'] = 'other';
          if (k.includes('twitter') || k.includes('x.com')) platform = 'twitter';
          else if (k.includes('discord')) platform = 'discord';
          else if (k.includes('github')) platform = 'github';
          else if (k.includes('telegram') || k.includes('tg')) platform = 'telegram';
          else if (k.includes('website') || k.includes('url')) platform = 'website';
          else if (k.includes('email') || k.includes('mail')) platform = 'email';
          else if (k.includes('farcaster')) platform = 'farcaster';
          else if (k.includes('lens')) platform = 'lens';

          const mapKey = `${platform}-${handle.toLowerCase()}`;
          if (!socialMap.has(mapKey)) {
            socialMap.set(mapKey, {
              platform,
              handle: platform === 'twitter' || platform === 'farcaster' || platform === 'lens'
                ? (handle.startsWith('@') ? handle : `@${handle}`)
                : handle,
              link: sanitizedLink,
            });
          }
        }
      }
    }

    const socials = Array.from(socialMap.values());
    const hasIdentity = Boolean(primaryName || socials.length > 0 || domains.length > 0);

    const report: WalletIdentityReport = {
      primaryName,
      primaryAvatar,
      description,
      socials,
      domains,
      hasIdentity,
    };

    identityCache.set(lower, report, 1800); // 30 min cache
    return report;
  } catch (err) {
    return getEmptyReport();
  } finally {
    clearTimeout(timeoutId);
  }
}

function getEmptyReport(): WalletIdentityReport {
  return {
    primaryName: null,
    primaryAvatar: null,
    description: null,
    socials: [],
    domains: [],
    hasIdentity: false,
  };
}
