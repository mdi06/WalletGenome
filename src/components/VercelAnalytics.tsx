'use client';

import { Analytics } from '@vercel/analytics/next';
import { redactAnalyticsEvent } from '@/lib/vercelAnalytics';

export default function VercelAnalytics() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
