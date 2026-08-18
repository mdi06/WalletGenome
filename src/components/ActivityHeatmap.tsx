'use client';

import { ScanResult, ActivityCell } from '@/lib/types';
import { Calendar, Clock, Flame, Zap } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '', '', '3a', '', '', '6a', '', '', '9a', '', '', '12p', '', '', '3p', '', '', '6p', '', '', '9p', '', ''];

export default function ActivityHeatmap({ results }: Props) {
  // Merge heatmaps from all chains
  const mergedMap = new Map<string, number>();
  let totalActiveDays = 0;
  let mostActiveDay = 'N/A';
  let mostActiveHour = 0;
  let longestStreak = 0;
  let avgTxsPerDay = 0;
  
  for (const r of results) {
    if (!r.activityProfile) continue;
    const ap = r.activityProfile;
    
    for (const cell of ap.heatmap) {
      const key = `${cell.day}-${cell.hour}`;
      mergedMap.set(key, (mergedMap.get(key) || 0) + cell.count);
    }
    
    totalActiveDays = Math.max(totalActiveDays, ap.totalActiveDays);
    if (ap.longestStreakDays > longestStreak) {
      longestStreak = ap.longestStreakDays;
      mostActiveDay = ap.mostActiveDay;
      mostActiveHour = ap.mostActiveHour;
      avgTxsPerDay = ap.avgTxsPerActiveDay;
    }
  }
  
  // Rebuild normalized cells
  let maxCount = 0;
  for (const count of mergedMap.values()) {
    if (count > maxCount) maxCount = count;
  }
  
  const cells: ActivityCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = mergedMap.get(`${day}-${hour}`) || 0;
      cells.push({
        day,
        hour,
        count,
        intensity: maxCount > 0 ? count / maxCount : 0,
      });
    }
  }
  
  if (cells.every(c => c.count === 0)) {
    return (
      <div style={styles.empty} className="glass-card">
        <p style={styles.emptyText}>No activity data available.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Stats Row */}
      <div style={styles.statsRow}>
        <StatBadge icon={<Calendar size={16} />} label="Active Days" value={String(totalActiveDays)} color="var(--accent-blue)" />
        <StatBadge icon={<Flame size={16} />} label="Longest Streak" value={`${longestStreak}d`} color="var(--accent-red)" />
        <StatBadge icon={<Clock size={16} />} label="Peak Hour" value={`${mostActiveHour}:00 UTC`} color="var(--accent-amber)" />
        <StatBadge icon={<Zap size={16} />} label="Peak Day" value={mostActiveDay} color="var(--accent-emerald)" />
        <StatBadge icon={<Zap size={16} />} label="Avg Txs/Day" value={avgTxsPerDay.toFixed(1)} color="var(--accent-purple)" />
      </div>

      {/* Heatmap Grid */}
      <div className="glass-card" style={styles.heatmapCard}>
        <h4 style={styles.sectionTitle}>Transaction Activity (UTC)</h4>
        <div style={styles.gridWrapper}>
          {/* Hour labels */}
          <div style={styles.hourLabels}>
            <div style={{ width: 36 }} /> {/* spacer for day labels */}
            {HOUR_LABELS.map((label, i) => (
              <div key={i} style={styles.hourLabel}>{label}</div>
            ))}
          </div>
          
          {/* Grid rows */}
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div key={dayIdx} style={styles.gridRow}>
              <div style={styles.dayLabel}>{dayLabel}</div>
              {Array.from({ length: 24 }, (_, hourIdx) => {
                const cell = cells.find(c => c.day === dayIdx && c.hour === hourIdx);
                const count = cell?.count || 0;
                const intensity = cell?.intensity || 0;
                
                return (
                  <div
                    key={hourIdx}
                    style={{
                      ...styles.cell,
                      background: count > 0
                        ? `rgba(129, 140, 248, ${0.1 + intensity * 0.8})`
                        : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: intensity > 0.7 ? `0 0 8px rgba(129, 140, 248, ${intensity * 0.4})` : 'none',
                    }}
                    title={`${dayLabel} ${hourIdx}:00 UTC — ${count} transaction${count !== 1 ? 's' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div style={styles.legend}>
          <span style={styles.legendLabel}>Less</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
            <div
              key={i}
              style={{
                ...styles.legendCell,
                background: intensity > 0
                  ? `rgba(129, 140, 248, ${0.1 + intensity * 0.8})`
                  : 'rgba(255, 255, 255, 0.02)',
              }}
            />
          ))}
          <span style={styles.legendLabel}>More</span>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="glass-card" style={styles.statBadge}>
      <div style={{ color, display: 'flex', flexShrink: 0 }}>{icon}</div>
      <div style={styles.statContent}>
        <span style={styles.statLabel}>{label}</span>
        <span style={{ ...styles.statValue, color }}>{value}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  statsRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
  },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: '10px 16px',
    flex: '1 1 auto',
    minWidth: 140,
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  heatmapCard: {
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
  gridWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    overflowX: 'auto' as const,
  },
  hourLabels: {
    display: 'flex',
    gap: 3,
    marginBottom: 4,
  },
  hourLabel: {
    width: 24,
    height: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  gridRow: {
    display: 'flex',
    gap: 3,
    alignItems: 'center',
  },
  dayLabel: {
    width: 36,
    fontSize: '0.7rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: 6,
  },
  cell: {
    width: 24,
    height: 24,
    borderRadius: 4,
    flexShrink: 0,
    transition: 'all var(--transition-fast)',
    cursor: 'default',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 'var(--space-md)',
  },
  legendLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-tertiary)',
  },
  legendCell: {
    width: 16,
    height: 16,
    borderRadius: 3,
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
