import { MultiChainScanResult, ScanResult } from '../types';

export function formatCompactUSD(val: any): string {
  try {
    let num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : Number(val);
    if (!num || isNaN(num) || !isFinite(num)) return '$0';
    const abs = Math.abs(num);
    if (abs >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    if (abs >= 1) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${num.toFixed(2)}`;
  } catch (e) {
    return '$0';
  }
}

export function extractProtocolBadges(data: MultiChainScanResult): string[] {
  const badges: string[] = [];
  const protocols = data.chains.flatMap(c => c.interactionsSummary?.topProtocols || []);

  protocols.forEach(p => {
    const name = (p.name || '').toUpperCase().replace(/\s+/g, '_');
    if (name.includes('UNISWAP')) badges.push('UNISWAP_TRADER');
    else if (name.includes('AAVE')) badges.push('AAVE_USER');
    else if (name.includes('LIDO')) badges.push('LIDO_STAKER');
    else if (name.includes('CURVE')) badges.push('CURVE_USER');
    else if (name.includes('MAKER')) badges.push('MAKER_DAO_USER');
    else if (name.includes('ACROSS')) badges.push('ACROSS_BRIDGER');
    else if (name.includes('STARGATE') || name.includes('LAYERZERO')) badges.push('STARGATE_BRIDGER');
    else if (name.includes('HYPERLIQUID')) badges.push('HYPERLIQUID_TRADER');
    else if (name.includes('GMX')) badges.push('GMX_TRADER');
    else if (name.includes('1INCH')) badges.push('1INCH_SWAPPER');
    else if (name.includes('METAMASK')) badges.push('METAMASK_SWAP_USER');
    else if (name.includes('VELODROME')) badges.push('VELODROME_USER');
    else if (name.includes('AERODROME')) badges.push('AERODROME_USER');
    else if (name.includes('SUSHISWAP')) badges.push('SUSHISWAP_USER');
    else if (name.includes('BALANCER')) badges.push('BALANCER_USER');
    else {
      const clean = name.replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
      if (clean) badges.push(`${clean}_USER`);
    }
  });

  // Verified Identity Badges
  if (
    data.identityReport?.domains?.some(d => d.platform === 'ens') ||
    data.identityReport?.primaryName?.endsWith('.eth')
  ) {
    badges.push('ENS_OWNER');
  }

  if (
    data.identityReport?.domains?.some(d => d.platform === 'farcaster') ||
    data.identityReport?.socials?.some(s => s.platform === 'farcaster')
  ) {
    badges.push('FARCASTER_USER');
  }

  if (
    data.identityReport?.domains?.some(d => d.platform === 'lens') ||
    data.identityReport?.socials?.some(s => s.platform === 'lens')
  ) {
    badges.push('LENS_USER');
  }

  if (
    data.identityReport?.domains?.some(d => d.platform === 'basenames') ||
    data.identityReport?.primaryName?.endsWith('.base.eth')
  ) {
    badges.push('BASENAMES_HOLDER');
  }

  return Array.from(new Set(badges)).slice(0, 8);
}

export interface RadarPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export function computeAggregatedRadarData(chains: ScanResult[]): RadarPoint[] {
  const dimensionAxes = [
    { subject: 'DeFi Diversity', axis: 'DeFi Diversity' },
    { subject: 'Activity', axis: 'Activity' },
    { subject: 'Capital Eff.', axis: 'Capital Efficiency' },
    { subject: 'Risk Appetite', axis: 'Risk Appetite' },
    { subject: 'Maturity', axis: 'Maturity' },
    { subject: 'Cross-Chain', axis: 'Network Breadth' },
  ];

  return dimensionAxes.map(({ subject, axis }) => {
    const scores = chains
      .map(c => c.fingerprint?.dimensions?.find(d => d.axis === axis || d.axis.toLowerCase().includes(axis.toLowerCase()))?.score)
      .filter((s): s is number => typeof s === 'number');

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 50;

    return {
      subject,
      value: avgScore,
      fullMark: 100,
    };
  });
}
// Force recompile
