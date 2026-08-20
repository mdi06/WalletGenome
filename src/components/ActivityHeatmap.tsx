import React, { useMemo } from 'react';
import { ScanResult, ActivityCell } from '@/lib/types';
import { Calendar, Clock, Flame, Zap } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '', '', '3a', '', '', '6a', '', '', '9a', '', '', '12p', '', '', '3p', '', '', '6p', '', '', '9p', '', ''];

export default function ActivityHeatmap({ results }: Props) {
  const { cells, totalActiveDays, mostActiveDay, mostActiveHour, longestStreak, hasActivity } = useMemo(() => {
    const mergedMap = new Map<string, number>();
    let totalActive = 0;
    let peakDay = 'N/A';
    let peakHour = 0;
    let maxStreak = 0;
    
    for (const r of results) {
      if (!r.activityProfile) continue;
      const ap = r.activityProfile;
      
      for (const cell of ap.heatmap) {
        const key = `${cell.day}-${cell.hour}`;
        mergedMap.set(key, (mergedMap.get(key) || 0) + cell.count);
      }
      
      totalActive = Math.max(totalActive, ap.totalActiveDays);
      if (ap.longestStreakDays > maxStreak) {
        maxStreak = ap.longestStreakDays;
        peakDay = ap.mostActiveDay;
        peakHour = ap.mostActiveHour;
      }
    }
    
    let maxCount = 0;
    for (const count of mergedMap.values()) {
      if (count > maxCount) maxCount = count;
    }
    
    const computedCells: ActivityCell[] = [];
    let anyActivity = false;
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = mergedMap.get(`${day}-${hour}`) || 0;
        if (count > 0) anyActivity = true;
        computedCells.push({
          day,
          hour,
          count,
          intensity: maxCount > 0 ? count / maxCount : 0,
        });
      }
    }

    return {
      cells: computedCells,
      totalActiveDays: totalActive,
      mostActiveDay: peakDay,
      mostActiveHour: peakHour,
      longestStreak: maxStreak,
      hasActivity: anyActivity,
    };
  }, [results]);
  
  if (!hasActivity) {
    return (
      <div className="p-8 text-center text-[#777777] text-xs font-bold font-mono">
        NO ACTIVITY RECORDED
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card-3d p-2.5 flex items-center gap-2">
          <Calendar size={14} className="text-[#ff5500]" />
          <div>
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase">Active Days</div>
            <div className="text-xs font-black text-[#0a0a0a] font-mono">{totalActiveDays} days</div>
          </div>
        </div>

        <div className="card-3d p-2.5 flex items-center gap-2">
          <Flame size={14} className="text-[#ff5500]" />
          <div>
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase">Streak</div>
            <div className="text-xs font-black text-[#0a0a0a] font-mono">{longestStreak} days</div>
          </div>
        </div>

        <div className="card-3d p-2.5 flex items-center gap-2">
          <Clock size={14} className="text-[#0a0a0a]" />
          <div>
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase">Peak Hour</div>
            <div className="text-xs font-black text-[#0a0a0a] font-mono">{mostActiveHour}:00 UTC</div>
          </div>
        </div>

        <div className="card-3d p-2.5 flex items-center gap-2">
          <Zap size={14} className="text-[#ff5500]" />
          <div>
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase">Peak Day</div>
            <div className="text-xs font-black text-[#0a0a0a] font-mono">{mostActiveDay}</div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid in Warm Orange Intensity */}
      <div className="overflow-x-auto pt-1">
        <div className="min-w-[540px] space-y-1">
          {/* Hour labels */}
          <div className="flex gap-1 mb-1 items-center">
            <div className="w-9 shrink-0 flex-none" />
            {HOUR_LABELS.map((label, i) => (
              <div key={i} className="w-5 shrink-0 flex-none text-center text-[9px] font-mono font-bold text-[#555555]">
                {label}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div key={dayIdx} className="flex gap-1 items-center">
              <div className="w-9 shrink-0 flex-none text-[10px] font-bold text-[#555555] font-mono text-right pr-2 select-none">
                {dayLabel}
              </div>
              {Array.from({ length: 24 }, (_, hourIdx) => {
                const cell = cells.find(c => c.day === dayIdx && c.hour === hourIdx);
                const count = cell?.count || 0;
                const intensity = cell?.intensity || 0;

                const bgStyle = count > 0
                  ? { backgroundColor: `rgba(255, 85, 0, ${0.25 + intensity * 0.75})` }
                  : { backgroundColor: '#cccccc' };

                return (
                  <div
                    key={hourIdx}
                    className="w-5 h-5 shrink-0 flex-none transition-transform hover:scale-110 cursor-default rounded-[1px]"
                    style={bgStyle}
                    title={`${dayLabel} ${hourIdx}:00 UTC — ${count} txs`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] font-bold text-[#555555] font-mono">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <div
            key={i}
            className="w-3.5 h-3.5"
            style={{
              backgroundColor: intensity > 0
                ? `rgba(255, 85, 0, ${0.25 + intensity * 0.75})`
                : '#cccccc',
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
