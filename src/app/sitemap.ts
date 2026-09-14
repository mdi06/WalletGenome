import type { MetadataRoute } from 'next';
import { absoluteUrl, SEO_LANDING_PAGES } from '@/lib/seo';

// Fixed to the latest repository-backed public-content change. Do not replace
// this with the request time or advance it without a real content update.
const LAST_CONTENT_CHANGE = '2026-09-14';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl('/'),
      lastModified: LAST_CONTENT_CHANGE,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/docs'),
      lastModified: LAST_CONTENT_CHANGE,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/privacy'),
      lastModified: LAST_CONTENT_CHANGE,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    ...SEO_LANDING_PAGES.map(page => ({
      url: absoluteUrl(`/${page.slug}`),
      lastModified: LAST_CONTENT_CHANGE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
