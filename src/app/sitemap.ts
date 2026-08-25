import type { MetadataRoute } from 'next';
import { absoluteUrl, SEO_LANDING_PAGES } from '@/lib/seo';

const LAST_CONTENT_REVIEW = new Date('2026-08-25T00:00:00.000Z');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl('/'),
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/docs'),
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...SEO_LANDING_PAGES.map(page => ({
      url: absoluteUrl(`/${page.slug}`),
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
