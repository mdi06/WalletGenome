import type { BeforeSendEvent } from '@vercel/analytics/next';

const EVM_ADDRESS_IN_PATH_PATTERN = /0x[a-f\d]{40}/gi;
const URL_BASE = 'https://walletgenome.invalid';

export function redactAnalyticsUrl(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl, typeof window === 'undefined' ? URL_BASE : window.location.origin);
    return `${parsedUrl.origin}${parsedUrl.pathname.replace(EVM_ADDRESS_IN_PATH_PATTERN, '[wallet]')}`;
  } catch {
    return URL_BASE;
  }
}

export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  return {
    ...event,
    url: redactAnalyticsUrl(event.url),
  };
}
