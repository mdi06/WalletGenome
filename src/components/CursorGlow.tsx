'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CURSOR_LERP_FACTOR,
  CURSOR_SETTLE_DISTANCE,
  hasFinePointerCapability,
  isCursorSettled,
  isFinePointerType,
  shouldRunDecorativeLoop,
} from './uiEffectRuntime';

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(pointer: fine)');
    const anyFinePointerQuery = window.matchMedia('(any-pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const animationFrameRef = { current: null as number | null };
    const hasPointerRef = { current: false };
    const finePointerRef = {
      current: hasFinePointerCapability(finePointerQuery.matches, anyFinePointerQuery.matches),
    };
    const reducedMotionRef = { current: reducedMotionQuery.matches };

    const cancelAnimation = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const applyPosition = () => {
      glowRef.current?.style.setProperty(
        'transform',
        `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`,
      );
    };

    const animate = () => {
      animationFrameRef.current = null;

      if (!finePointerRef.current || !hasPointerRef.current || !shouldRunDecorativeLoop({
        reducedMotion: reducedMotionRef.current,
        documentHidden: document.hidden,
      })) {
        return;
      }

      current.x += (target.x - current.x) * CURSOR_LERP_FACTOR;
      current.y += (target.y - current.y) * CURSOR_LERP_FACTOR;
      applyPosition();

      if (isCursorSettled(current, target, CURSOR_SETTLE_DISTANCE)) {
        current.x = target.x;
        current.y = target.y;
        applyPosition();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const scheduleAnimation = () => {
      if (
        animationFrameRef.current !== null
        || !finePointerRef.current
        || !hasPointerRef.current
        || !shouldRunDecorativeLoop({
          reducedMotion: reducedMotionRef.current,
          documentHidden: document.hidden,
        })
      ) {
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const disableEffect = () => {
      cancelAnimation();
      hasPointerRef.current = false;
      setIsEnabled(false);
      setIsVisible(false);
    };

    const syncEnvironment = () => {
      finePointerRef.current = hasFinePointerCapability(
        finePointerQuery.matches,
        anyFinePointerQuery.matches,
      );
      reducedMotionRef.current = reducedMotionQuery.matches;

      if (!finePointerRef.current || reducedMotionRef.current) {
        disableEffect();
        return;
      }

      setIsEnabled(true);
      if (!document.hidden) scheduleAnimation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isFinePointerType(event.pointerType) || reducedMotionRef.current) return;

      // Pointer events provide a useful fallback on browsers that do not expose
      // accurate pointer media-query state, while touch-only devices stay disabled.
      finePointerRef.current = true;
      setIsEnabled(true);
      target.x = event.clientX;
      target.y = event.clientY;

      if (!hasPointerRef.current) {
        current.x = target.x;
        current.y = target.y;
        hasPointerRef.current = true;
        applyPosition();
      }

      setIsVisible(true);
      scheduleAnimation();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimation();
        return;
      }
      scheduleAnimation();
    };

    const addMediaChangeListener = (query: MediaQueryList) => {
      query.addEventListener('change', syncEnvironment);
      return () => query.removeEventListener('change', syncEnvironment);
    };

    const removeFinePointerListener = addMediaChangeListener(finePointerQuery);
    const removeAnyFinePointerListener = addMediaChangeListener(anyFinePointerQuery);
    const removeReducedMotionListener = addMediaChangeListener(reducedMotionQuery);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    syncEnvironment();

    return () => {
      removeFinePointerListener();
      removeAnyFinePointerListener();
      removeReducedMotionListener();
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimation();
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed left-0 top-0 -z-[5] h-[560px] w-[560px] rounded-full transition-opacity duration-700 ease-in-out"
      style={{
        contain: 'layout paint',
        opacity: isVisible ? 1 : 0,
        transform: 'translate3d(var(--x, 50vw), var(--y, 50vh), 0) translate(-50%, -50%)',
        background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.5), transparent 40%)',
        willChange: isVisible ? 'transform' : 'auto',
      }}
      aria-hidden="true"
    />
  );
}
