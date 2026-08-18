'use client';

import { useState } from 'react';
import { ScanResult } from '@/lib/types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, BookOpen, Layers, ShieldCheck, Zap, Network, Clock, DollarSign } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

export default function BehavioralFingerprint({ results }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  // Merge dimensions across scanned chains if multiple chains
  const validChain = results.find(r => r.fingerprint?.dimensions?.length > 0);
  const fingerprint = validChain?.fingerprint;

  if (!fingerprint) {
    return (
      <div style={styles.empty} className="glass-card">
        <p style={styles.emptyText}>No behavioral data available. Scan a wallet with transaction history.</p>
      </div>
    );
  }

  const chartData = fingerprint.dimensions.map(d => ({
    axis: d.axis,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div style={styles.container}>
      {/* Persona Header Card */}
      <div className="glass-card" style={styles.personaCard}>
        <div style={styles.personaHeader}>
          <span style={styles.personaEmoji}>{getPersonaEmoji(fingerprint.persona)}</span>
          <div style={{ flex: 1 }}>
            <div style={styles.personaTitleRow}>
              <h3 style={styles.personaName}>{fingerprint.persona}</h3>
              <span style={styles.personaBadge}>Classified Persona</span>
            </div>
            <p style={styles.personaDesc}>{fingerprint.personaDescription}</p>
          </div>
        </div>

        {/* Key metrics */}
        <div style={styles.metaRow}>
          <MetaStat label="Wallet Age" value={`${fingerprint.walletAgeMonths} mo`} sub="From first active tx" />
          <MetaStat label="Active Months" value={String(fingerprint.activeMonths)} sub="Months with activity" />
          <MetaStat label="Unique Contracts" value={String(fingerprint.uniqueContracts)} sub="Interacted protocols" />
          <MetaStat label="First Activity" value={fingerprint.firstActivityDate} sub="Earliest on-chain block" />
        </div>
      </div>

      {/* Radar Chart + Dimension Breakdown */}
      <div style={styles.chartRow}>
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.sectionHeader}>
            <h4 style={styles.sectionTitle}>Behavioral Radar (0–100)</h4>
            <span style={styles.sectionSub}>Quantitative footprint</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="var(--accent-indigo)"
                fill="var(--accent-indigo)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
                formatter={(value: unknown) => [`${value}/100`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={styles.detailsCard}>
          <div style={styles.sectionHeader}>
            <h4 style={styles.sectionTitle}>6-Dimension Breakdown</h4>
            <span style={styles.sectionSub}>Score & On-Chain Metrics</span>
          </div>
          <div style={styles.dimensionList}>
            {fingerprint.dimensions.map((d, i) => (
              <div key={i} style={styles.dimensionItem}>
                <div style={styles.dimHeader}>
                  <span style={styles.dimName}>{d.axis}</span>
                  <span style={{
                    ...styles.dimScore,
                    color: getScoreColor(d.score),
                  }}>{d.score} / 100</span>
                </div>
                <div style={styles.dimBarBg}>
                  <div style={{
                    ...styles.dimBarFill,
                    width: `${d.score}%`,
                    background: getScoreGradient(d.score),
                  }} />
                </div>
                <span style={styles.dimDetail}>{d.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanatory Methodology Card */}
      <div className="glass-card" style={styles.guideCard}>
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          style={styles.guideToggle}
        >
          <div style={styles.guideToggleLeft}>
            <BookOpen size={18} color="var(--accent-indigo)" />
            <span style={styles.guideToggleTitle}>How Behavioral Fingerprinting Works</span>
          </div>
          <div style={styles.guideToggleRight}>
            <span style={styles.guideToggleHint}>{showMethodology ? 'Hide Guide' : 'Explain Dimensions & Methodology'}</span>
            {showMethodology ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showMethodology && (
          <div style={styles.guideBody}>
            <p style={styles.guideIntro}>
              The <strong>Behavioral Fingerprint</strong> translates raw on-chain transaction history into a structured quantitative profile across 6 core behavioral axes (scored 0 to 100).
            </p>

            <div style={styles.guideGrid}>
              <DimensionGuideItem
                icon={<Layers size={18} color="var(--accent-indigo)" />}
                title="DeFi Diversity"
                description="Uses Shannon Information Entropy across protocol categories (Swaps, Lending, Staking, Bridges, NFTs). Wallets interacting with a wide variety of DeFi primitives receive scores up to 100, while wallets doing only simple transfers receive near 0."
              />
              <DimensionGuideItem
                icon={<Zap size={18} color="var(--accent-blue)" />}
                title="Activity Intensity"
                description="Calculates transaction frequency normalized per active month. Differentiates high-frequency active traders and bot operators from long-term passive holders."
              />
              <DimensionGuideItem
                icon={<DollarSign size={18} color="var(--accent-emerald)" />}
                title="Capital Efficiency"
                description="Measures the ratio of total on-chain USD value moved relative to total gas fees consumed. High-volume transfers with minimal gas burn achieve maximum efficiency."
              />
              <DimensionGuideItem
                icon={<ShieldCheck size={18} color="var(--accent-red)" />}
                title="Risk Appetite"
                description="Analyzes the proportion of failed/reverted transactions, unverified contract interactions, and aggressive priority fee tips. Identifies degen trading vs conservative operations."
              />
              <DimensionGuideItem
                icon={<Clock size={18} color="var(--accent-amber)" />}
                title="Wallet Maturity"
                description="Evaluates wallet lifespan from the earliest recorded on-chain transaction combined with consistency of active months over time."
              />
              <DimensionGuideItem
                icon={<Network size={18} color="var(--accent-purple)" />}
                title="Network Breadth"
                description="Computes counterparty graph density based on the number of unique recipient addresses, smart contracts, and cross-chain bridging routes utilized."
              />
            </div>

            <div style={styles.personaExplainBox}>
              <div style={styles.personaExplainHeader}>
                <Sparkles size={16} color="var(--accent-indigo)" />
                <span style={styles.personaExplainTitle}>Persona Classification Logic</span>
              </div>
              <p style={styles.personaExplainText}>
                Based on the multi-axial scores, the engine matches the address against predefined behavioral heuristics:
              </p>
              <ul style={styles.personaList}>
                <li><strong>DeFi Power User:</strong> High DeFi Diversity (&gt;60) with balanced swaps, lending, staking, and bridges.</li>
                <li><strong>Active Trader:</strong> High swap frequency (&gt;40% of all txs) and high activity intensity.</li>
                <li><strong>Cautious Holder:</strong> Low transaction frequency, high capital efficiency, and zero failed transactions.</li>
                <li><strong>Airdrop Farmer:</strong> High activity intensity but low DeFi diversity (repetitive contract calls).</li>
                <li><strong>Passive Whale:</strong> Multi-year maturity (&gt;50) with low transaction frequency and large balances.</li>
                <li><strong>Gas Burner:</strong> Elevated risk appetite (&gt;60) with high failed transaction rates.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DimensionGuideItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={styles.guideItem}>
      <div style={styles.guideItemHeader}>
        {icon}
        <span style={styles.guideItemTitle}>{title}</span>
      </div>
      <p style={styles.guideItemDesc}>{description}</p>
    </div>
  );
}

function MetaStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={styles.metaStat}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={styles.metaValue}>{value}</span>
      {sub && <span style={styles.metaSub}>{sub}</span>}
    </div>
  );
}

function getPersonaEmoji(persona: string): string {
  const map: Record<string, string> = {
    'DeFi Power User': '⚡',
    'Active Trader': '📈',
    'Cautious Holder': '🛡️',
    'NFT Collector': '🎨',
    'Airdrop Farmer': '🌾',
    'Bridge Heavy': '🌉',
    'Gas Burner': '🔥',
    'Passive Whale': '🐋',
    'New Wallet': '🆕',
  };
  return map[persona] || '👤';
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'var(--accent-emerald)';
  if (score >= 40) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

function getScoreGradient(score: number): string {
  if (score >= 70) return 'linear-gradient(90deg, var(--accent-emerald), #34d399)';
  if (score >= 40) return 'linear-gradient(90deg, var(--accent-amber), #fbbf24)';
  return 'linear-gradient(90deg, var(--accent-red), #f87171)';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  personaCard: {
    padding: 'var(--space-lg)',
  },
  personaHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-md)',
  },
  personaEmoji: {
    fontSize: '2.4rem',
    flexShrink: 0,
    lineHeight: 1,
  },
  personaTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    marginBottom: 4,
  },
  personaName: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--accent-indigo)',
  },
  personaBadge: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--accent-indigo-dim)',
    color: 'var(--accent-indigo)',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  personaDesc: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  metaRow: {
    display: 'flex',
    gap: 'var(--space-xl)',
    flexWrap: 'wrap' as const,
    paddingTop: 'var(--space-md)',
    borderTop: '1px solid var(--border-primary)',
  },
  metaStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  metaLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    fontWeight: 500,
  },
  metaValue: {
    fontSize: '1.05rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  metaSub: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
  },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 'var(--space-md)',
  },
  chartCard: {
    padding: 'var(--space-lg)',
  },
  detailsCard: {
    padding: 'var(--space-lg)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-md)',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  sectionSub: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  dimensionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  dimensionItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  dimHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dimName: {
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  dimScore: {
    fontSize: '0.82rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  dimBarBg: {
    height: 5,
    borderRadius: 3,
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  dimBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.6s ease',
  },
  dimDetail: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  guideCard: {
    padding: 'var(--space-md) var(--space-lg)',
  },
  guideToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    padding: '4px 0',
    fontFamily: 'var(--font-sans)',
  },
  guideToggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  guideToggleTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  guideToggleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    color: 'var(--accent-indigo)',
    fontSize: '0.82rem',
  },
  guideToggleHint: {
    fontWeight: 500,
  },
  guideBody: {
    marginTop: 'var(--space-lg)',
    paddingTop: 'var(--space-md)',
    borderTop: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  guideIntro: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  guideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'var(--space-md)',
  },
  guideItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  guideItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  guideItemTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  guideItemDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
  },
  personaExplainBox: {
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
  },
  personaExplainHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  personaExplainTitle: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--accent-indigo)',
  },
  personaExplainText: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  personaList: {
    paddingLeft: 'var(--space-lg)',
    fontSize: '0.82rem',
    color: 'var(--text-tertiary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    lineHeight: 1.5,
  },
  empty: {
    padding: 'var(--space-2xl)',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: 'var(--text-tertiary)',
    fontSize: '0.9rem',
  },
};
