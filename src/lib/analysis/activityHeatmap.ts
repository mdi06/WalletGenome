import { ProcessedTransaction, ActivityProfile, ActivityCell } from '../types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MS = 24 * 60 * 60 * 1000;

function calculateStreaks(activeDates: string[]): { longest: number; current: number } {
  if (activeDates.length === 0) return { longest: 0, current: 0 };

  let longest = 1;
  let running = 1;
  for (let index = 1; index < activeDates.length; index++) {
    const previous = Date.parse(`${activeDates[index - 1]}T00:00:00Z`);
    const current = Date.parse(`${activeDates[index]}T00:00:00Z`);
    if (current - previous === DAY_MS) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  let current = 1;
  for (let index = activeDates.length - 1; index > 0; index--) {
    const previous = Date.parse(`${activeDates[index - 1]}T00:00:00Z`);
    const latest = Date.parse(`${activeDates[index]}T00:00:00Z`);
    if (latest - previous !== DAY_MS) break;
    current++;
  }

  return { longest, current };
}

function buildActivityProfile(matrix: Map<string, number>, dates: Iterable<string>): ActivityProfile {
  const activeDates = [...new Set(dates)].sort();
  const maxCount = Math.max(0, ...matrix.values());
  const heatmap: ActivityCell[] = [];
  const dayTotals = new Array<number>(7).fill(0);
  const hourTotals = new Array<number>(24).fill(0);
  let totalTransactions = 0;

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = matrix.get(`${day}-${hour}`) || 0;
      heatmap.push({ day, hour, count, intensity: maxCount > 0 ? count / maxCount : 0 });
      dayTotals[day] += count;
      hourTotals[hour] += count;
      totalTransactions += count;
    }
  }

  const mostActiveDayIndex = maxCount > 0 ? dayTotals.indexOf(Math.max(...dayTotals)) : -1;
  const mostActiveHour = maxCount > 0 ? hourTotals.indexOf(Math.max(...hourTotals)) : 0;
  const streaks = calculateStreaks(activeDates);

  return {
    heatmap,
    activeDates,
    totalActiveDays: activeDates.length,
    mostActiveDay: DAY_NAMES[mostActiveDayIndex] || 'N/A',
    mostActiveHour,
    longestStreakDays: streaks.longest,
    currentStreakDays: streaks.current,
    avgTxsPerActiveDay: activeDates.length > 0 ? totalTransactions / activeDates.length : 0,
  };
}

export function aggregateActivityProfiles(profiles: ActivityProfile[]): ActivityProfile {
  const matrix = new Map<string, number>();
  const activeDates = new Set<string>();

  for (const profile of profiles) {
    for (const cell of profile.heatmap) {
      const key = `${cell.day}-${cell.hour}`;
      matrix.set(key, (matrix.get(key) || 0) + cell.count);
    }
    for (const date of profile.activeDates) activeDates.add(date);
  }

  return buildActivityProfile(matrix, activeDates);
}

export function analyzeActivityProfile(
  transactions: ProcessedTransaction[]
): ActivityProfile {
  // Build day×hour matrix (7 days × 24 hours)
  const matrix = new Map<string, number>(); // "day-hour" → count
  const dailyActivity = new Map<string, number>(); // "YYYY-MM-DD" → count
  
  for (const tx of transactions) {
    if (!tx.timestamp || tx.timestamp <= 0) continue;
    
    const d = new Date(tx.timestamp * 1000);
    const day = d.getUTCDay(); // 0=Sun
    const hour = d.getUTCHours();
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    
    const key = `${day}-${hour}`;
    matrix.set(key, (matrix.get(key) || 0) + 1);
    dailyActivity.set(dateKey, (dailyActivity.get(dateKey) || 0) + 1);
  }
  
  return buildActivityProfile(matrix, dailyActivity.keys());
}
