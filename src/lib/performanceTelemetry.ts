export const PERFORMANCE_TELEMETRY_PATH = '/api/web-vitals';
export const PERFORMANCE_SAMPLE_RATE = 0.1;
export const PERFORMANCE_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || '0.1.0';

export const PERFORMANCE_METRIC_NAMES = ['TTFB', 'FCP', 'LCP', 'FID', 'INP', 'CLS'] as const;
export type PerformanceMetricName = typeof PERFORMANCE_METRIC_NAMES[number];

export const PERFORMANCE_DEVICE_CATEGORIES = ['mobile', 'desktop'] as const;
export type PerformanceDeviceCategory = typeof PERFORMANCE_DEVICE_CATEGORIES[number];

export const PERFORMANCE_RATINGS = ['good', 'needs-improvement', 'poor'] as const;
export type PerformanceRating = typeof PERFORMANCE_RATINGS[number];

export const PERFORMANCE_ROUTE_TEMPLATES = ['/', '/docs', '/[slug]', '/other'] as const;
export type PerformanceRouteTemplate = typeof PERFORMANCE_ROUTE_TEMPLATES[number];

export interface PerformanceMetricEvent {
  eventId: string;
  routeTemplate: PerformanceRouteTemplate;
  deviceCategory: PerformanceDeviceCategory;
  metricName: PerformanceMetricName;
  value: number;
  rating: PerformanceRating;
  appVersion: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function isSafeOpaqueId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}

function isSafeAppVersion(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(value);
}

function isValidMetricValue(metricName: PerformanceMetricName, value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  return metricName === 'CLS' ? value <= 100 : value <= 600_000;
}

export function normalizePerformanceRoute(pathname: string | null | undefined): PerformanceRouteTemplate {
  if (pathname === '/' || pathname === '/docs') return pathname;
  if (typeof pathname === 'string' && /^\/[^/]+$/.test(pathname)) return '/[slug]';
  return '/other';
}

export function parsePerformanceMetricEvent(value: unknown): PerformanceMetricEvent | null {
  if (!isRecord(value)) return null;

  const expectedKeys = [
    'eventId',
    'routeTemplate',
    'deviceCategory',
    'metricName',
    'value',
    'rating',
    'appVersion',
  ];
  if (Object.keys(value).some(key => !expectedKeys.includes(key)) || Object.keys(value).length !== expectedKeys.length) {
    return null;
  }

  if (
    !isSafeOpaqueId(value.eventId)
    || !isOneOf(PERFORMANCE_ROUTE_TEMPLATES, value.routeTemplate)
    || !isOneOf(PERFORMANCE_DEVICE_CATEGORIES, value.deviceCategory)
    || !isOneOf(PERFORMANCE_METRIC_NAMES, value.metricName)
    || !isValidMetricValue(value.metricName, value.value)
    || !isOneOf(PERFORMANCE_RATINGS, value.rating)
    || !isSafeAppVersion(value.appVersion)
  ) {
    return null;
  }

  return {
    eventId: value.eventId,
    routeTemplate: value.routeTemplate,
    deviceCategory: value.deviceCategory,
    metricName: value.metricName,
    value: value.value,
    rating: value.rating,
    appVersion: value.appVersion,
  };
}
