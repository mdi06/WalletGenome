export const CURSOR_LERP_FACTOR = 0.1;
export const CURSOR_SETTLE_DISTANCE = 0.5;
export const BACKGROUND_FRAME_INTERVAL_MS = 1000 / 30;
export const BACKGROUND_MAX_ELAPSED_MS = 100;

export interface DecorativeEffectState {
  reducedMotion: boolean;
  documentHidden: boolean;
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
