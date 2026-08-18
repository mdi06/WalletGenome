'use client';

import { ScanResult } from '@/lib/types';
import { Shield, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

export default function RiskScore({ results }: Props) {
  // Aggregate risk across chains — use worst score
  const assessments = results.map(r => r.riskAssessment).filter(Boolean);
  if (assessments.length === 0) return null;
  
  const worstAssessment = assessments.reduce((worst, curr) =>
    curr.score > worst.score ? curr : worst
  , assessments[0]);

  const { score, grade, factors } = worstAssessment;

  return (
    <div style={styles.container}>
      {/* Gauge */}
      <div className="glass-card" style={styles.gaugeCard}>
        <div style={styles.gaugeWrapper}>
          <svg viewBox="0 0 200 120" style={styles.gaugeSvg}>
            {/* Background arc */}
            <path
              d={describeArc(100, 100, 80, -180, 0)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Filled arc */}
            <path
              d={describeArc(100, 100, 80, -180, -180 + (score / 100) * 180)}
              fill="none"
              stroke={getGradeColor(grade)}
              strokeWidth="12"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${getGradeColor(grade)}40)` }}
            />
            {/* Score text */}
            <text x="100" y="85" textAnchor="middle" style={{ fill: getGradeColor(grade), fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {score}
            </text>
            <text x="100" y="108" textAnchor="middle" style={{ fill: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 500 }}>
              / 100
            </text>
          </svg>
          <div style={styles.gradeBadgeWrapper}>
            <span style={{ ...styles.gradeBadge, background: getGradeColor(grade) + '20', color: getGradeColor(grade), borderColor: getGradeColor(grade) + '40' }}>
              Grade {grade}
            </span>
            <span style={styles.gradeDesc}>{getGradeDescription(grade)}</span>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="glass-card" style={styles.factorsCard}>
        <h4 style={styles.sectionTitle}>Risk Factors</h4>
        <div style={styles.factorList}>
          {factors.map((factor, i) => (
            <div key={i} style={styles.factorItem}>
              <div style={styles.factorHeader}>
                <div style={styles.factorIcon}>
                  {factor.severity === 'critical' && <AlertOctagon size={16} color="var(--accent-red)" />}
                  {factor.severity === 'warning' && <AlertTriangle size={16} color="var(--accent-amber)" />}
                  {factor.severity === 'info' && <Info size={16} color="var(--accent-blue)" />}
                </div>
                <span style={styles.factorLabel}>{factor.label}</span>
                {factor.impact > 0 && (
                  <span style={{
                    ...styles.factorImpact,
                    color: factor.severity === 'critical' ? 'var(--accent-red)' : factor.severity === 'warning' ? 'var(--accent-amber)' : 'var(--text-tertiary)',
                  }}>
                    +{factor.impact}
                  </span>
                )}
              </div>
              <p style={styles.factorDesc}>{factor.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#34d399';
    case 'B': return '#60a5fa';
    case 'C': return '#fbbf24';
    case 'D': return '#f97316';
    case 'F': return '#f87171';
    default: return '#818cf8';
  }
}

function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent — Minimal risk detected';
    case 'B': return 'Good — Minor concerns identified';
    case 'C': return 'Fair — Several risk factors present';
    case 'D': return 'Poor — Significant risks detected';
    case 'F': return 'Critical — Immediate action recommended';
    default: return '';
  }
}

// SVG arc helper
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-md)',
  },
  gaugeCard: {
    padding: 'var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  gaugeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  gaugeSvg: {
    width: 240,
    height: 140,
  },
  gradeBadgeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  gradeBadge: {
    display: 'inline-flex',
    padding: '4px 16px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.9rem',
    fontWeight: 700,
    border: '1px solid',
    letterSpacing: '0.04em',
  },
  gradeDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-tertiary)',
  },
  factorsCard: {
    padding: 'var(--space-lg)',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-md)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  factorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  factorItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingBottom: 'var(--space-sm)',
    borderBottom: '1px solid var(--border-primary)',
  },
  factorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  factorIcon: {
    flexShrink: 0,
    display: 'flex',
  },
  factorLabel: {
    fontSize: '0.85rem',
    fontWeight: 600,
    flex: 1,
  },
  factorImpact: {
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  factorDesc: {
    fontSize: '0.78rem',
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
    paddingLeft: 24,
  },
};
