'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import {
  PERFORMANCE_APP_VERSION,
  PERFORMANCE_SAMPLE_RATE,
  PERFORMANCE_TELEMETRY_PATH,
  normalizePerformanceRoute,
  parsePerformanceMetricEvent,
  type PerformanceMetricEvent,
} from '@/lib/performanceTelemetry';

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];
type WebVitalsMetric = Parameters<ReportWebVitalsCallback>[0];

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function createAnonymousEventId(metricId: string): string {
  const suppliedId = metricId.trim();
  if (OPAQUE_ID_PATTERN.test(suppliedId)) return suppliedId;

  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `wv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getDeviceCategory(): 'mobile' | 'desktop' {
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

function sendPerformanceMetric(event: PerformanceMetricEvent): void {
  const body = JSON.stringify(event);

  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(PERFORMANCE_TELEMETRY_PATH, body)) {
      return;
    }

    void fetch(PERFORMANCE_TELEMETRY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Performance telemetry must never affect the application experience.
  }
}

export function WebVitals() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const reportWebVitals = useCallback<ReportWebVitalsCallback>((metric: WebVitalsMetric) => {
    if (Math.random() > PERFORMANCE_SAMPLE_RATE) return;

    const event = parsePerformanceMetricEvent({
      eventId: createAnonymousEventId(metric.id),
      routeTemplate: normalizePerformanceRoute(pathnameRef.current),
      deviceCategory: getDeviceCategory(),
      metricName: metric.name,
      value: metric.value,
      rating: metric.rating,
      appVersion: PERFORMANCE_APP_VERSION,
    });

    if (event) sendPerformanceMetric(event);
  }, []);

  useReportWebVitals(reportWebVitals);
  return null;
}
