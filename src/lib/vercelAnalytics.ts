import type { BeforeSendEvent } from '@vercel/analytics/next';
import { redactAnalyticsUrl } from './analyticsPrivacy';

export { redactAnalyticsUrl } from './analyticsPrivacy';

export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  return {
    ...event,
    url: redactAnalyticsUrl(event.url),
  };
}
