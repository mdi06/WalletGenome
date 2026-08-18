import { ProcessedTransaction, ActivityProfile, ActivityCell } from '../types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  
  // Find max count for normalization
  let maxCount = 0;
  for (const count of matrix.values()) {
    if (count > maxCount) maxCount = count;
  }
  
  // Build heatmap cells
  const heatmap: ActivityCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = matrix.get(`${day}-${hour}`) || 0;
      heatmap.push({
        day,
        hour,
        count,
        intensity: maxCount > 0 ? count / maxCount : 0,
      });
    }
  }
  
  // Most active day of week
  const dayTotals = new Array(7).fill(0);
  for (const cell of heatmap) {
    dayTotals[cell.day] += cell.count;
  }
  const mostActiveDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
  
  // Most active hour
  const hourTotals = new Array(24).fill(0);
  for (const cell of heatmap) {
    hourTotals[cell.hour] += cell.count;
  }
  const mostActiveHour = hourTotals.indexOf(Math.max(...hourTotals));
  
  // Activity streaks
  const totalActiveDays = dailyActivity.size;
  const activeDates = [...dailyActivity.keys()].sort();
  
  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 1;
  
  for (let i = 1; i < activeDates.length; i++) {
    const prev = new Date(activeDates[i - 1] + 'T00:00:00Z');
    const curr = new Date(activeDates[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 3600 * 1000));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      tempStreak = 1;
    }
  }
  if (tempStreak > longestStreak) longestStreak = tempStreak;
  
  // Current streak (from most recent date backwards)
  if (activeDates.length > 0) {
    currentStreak = 1;
    for (let i = activeDates.length - 1; i > 0; i--) {
      const prev = new Date(activeDates[i - 1] + 'T00:00:00Z');
      const curr = new Date(activeDates[i] + 'T00:00:00Z');
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 3600 * 1000));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  const totalTxs = transactions.length;
  const avgTxsPerActiveDay = totalActiveDays > 0 ? totalTxs / totalActiveDays : 0;
  
  return {
    heatmap,
    totalActiveDays,
    mostActiveDay: DAY_NAMES[mostActiveDayIdx] || 'N/A',
    mostActiveHour,
    longestStreakDays: longestStreak,
    currentStreakDays: currentStreak,
    avgTxsPerActiveDay,
  };
}
