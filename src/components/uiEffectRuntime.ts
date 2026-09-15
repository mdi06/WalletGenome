export const CURSOR_LERP_FACTOR = 0.1;
export const CURSOR_SETTLE_DISTANCE = 0.5;
export const BACKGROUND_FRAME_INTERVAL_MS = 1000 / 30;
export const BACKGROUND_MAX_ELAPSED_MS = 100;

export interface DecorativeEffectState {
  reducedMotion: boolean;
  documentHidden: boolean;
}

export type MediaQueryChangeListener = (event: MediaQueryListEvent) => void;

export interface MediaQueryChangeSource {
  addEventListener?: (type: 'change', listener: MediaQueryChangeListener) => void;
  removeEventListener?: (type: 'change', listener: MediaQueryChangeListener) => void;
  addListener: (listener: MediaQueryChangeListener) => void;
  removeListener: (listener: MediaQueryChangeListener) => void;
}

/**
 * iOS Safari before 14 exposes the deprecated MediaQueryList listener API but
 * not EventTarget's addEventListener API. Decorative effects must subscribe to
 * both without allowing that capability gap to abort their setup.
 */
export function subscribeToMediaQueryChange(
  mediaQuery: MediaQueryChangeSource,
  listener: MediaQueryChangeListener,
): () => void {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener?.('change', listener);
  }

  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
}

export function shouldRunDecorativeLoop({
  reducedMotion,
  documentHidden,
}: DecorativeEffectState): boolean {
  return !reducedMotion && !documentHidden;
}

export function hasFinePointerCapability(
  primaryPointerIsFine: boolean,
  anyPointerIsFine: boolean,
): boolean {
  return primaryPointerIsFine || anyPointerIsFine;
}

export function isFinePointerType(pointerType: string): boolean {
  return pointerType !== 'touch';
}

export function isCursorSettled(
  current: { x: number; y: number },
  target: { x: number; y: number },
  threshold = CURSOR_SETTLE_DISTANCE,
): boolean {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  return dx * dx + dy * dy <= threshold * threshold;
}

export function getBoundedElapsedMs(
  elapsedMs: number,
  maxElapsedMs = BACKGROUND_MAX_ELAPSED_MS,
): number {
  return Math.min(maxElapsedMs, Math.max(0, elapsedMs));
}

export function shouldDrawFrame(
  now: number,
  lastDrawAt: number | null,
  frameIntervalMs = BACKGROUND_FRAME_INTERVAL_MS,
): boolean {
  return lastDrawAt === null || now - lastDrawAt >= frameIntervalMs;
}
