'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { buildGoogleAnalyticsPageView } from '@/lib/googleAnalytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsPageViewsProps {
  measurementId: string;
}

export default function GoogleAnalyticsPageViews({ measurementId }: GoogleAnalyticsPageViewsProps) {
  const pathname = usePathname();
  const lastPageLocation = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || typeof window.gtag !== 'function') return;

    const pageView = buildGoogleAnalyticsPageView(window.location.href);
    if (lastPageLocation.current === pageView.page_location) return;

    lastPageLocation.current = pageView.page_location;
    window.gtag('event', 'page_view', { ...pageView, send_to: measurementId });
  }, [measurementId, pathname]);

  return null;
}
