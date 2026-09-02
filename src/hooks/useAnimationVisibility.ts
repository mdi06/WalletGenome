'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useAnimationVisibility<T extends HTMLElement>(elementRef: RefObject<T | null>) {
  const [isInViewport, setIsInViewport] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const syncPageVisibility = () => {
      setIsPageVisible(!document.hidden);
    };

    syncPageVisibility();
    document.addEventListener('visibilitychange', syncPageVisibility);

    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return () => {
        document.removeEventListener('visibilitychange', syncPageVisibility);
      };
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsInViewport(entry?.isIntersecting ?? true);
    }, { threshold: 0.01 });
    observer.observe(element);

    return () => {
      document.removeEventListener('visibilitychange', syncPageVisibility);
      observer.disconnect();
    };
  }, [elementRef]);

  return {
    isVisible: isInViewport && isPageVisible,
  };
}
