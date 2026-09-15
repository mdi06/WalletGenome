import { redactAnalyticsUrl } from './analyticsPrivacy';

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

export interface GoogleAnalyticsPageView {
  page_location: string;
  page_path: string;
}

export function normalizeGoogleAnalyticsMeasurementId(value: string | undefined): string | null {
  const measurementId = value?.trim().toUpperCase();
  return measurementId && MEASUREMENT_ID_PATTERN.test(measurementId) ? measurementId : null;
}

export function getGoogleAnalyticsMeasurementId(): string | null {
  return normalizeGoogleAnalyticsMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
}

export function createGoogleAnalyticsBootstrap(measurementId: string): string {
  return [
    'window.dataLayer = window.dataLayer || [];',
    'window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};',
    "window.gtag('js', new Date());",
    `window.gtag('config', '${measurementId}', { send_page_view: false });`,
  ].join('\n');
}

export function buildGoogleAnalyticsPageView(rawUrl: string): GoogleAnalyticsPageView {
  const pageLocation = redactAnalyticsUrl(rawUrl);
  return {
    page_location: pageLocation,
    page_path: new URL(pageLocation).pathname,
  };
}
