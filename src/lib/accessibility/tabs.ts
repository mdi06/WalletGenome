const TAB_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'] as const;
type TabKey = typeof TAB_KEYS[number];

export function getNextTabIndex(currentIndex: number, tabCount: number, key: string): number | null {
  if (tabCount <= 0 || !TAB_KEYS.includes(key as TabKey)) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return tabCount - 1;
  if (key === 'ArrowLeft') return (currentIndex - 1 + tabCount) % tabCount;
  return (currentIndex + 1) % tabCount;
}
