import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development';

function configuredSupabaseOrigin(configuredUrl: string | undefined): string | null {
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    const isSecure = url.protocol === 'https:';
    const isLocal = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    return isSecure || isLocal ? url.origin : null;
  } catch {
    return null;
  }
}

function hasGoogleAnalyticsMeasurementId(value: string | undefined): boolean {
  return /^G-[A-Z0-9]+$/i.test(value?.trim() ?? '');
}

export function buildContentSecurityPolicy(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  googleAnalyticsMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
): string {
  const supabaseOrigin = configuredSupabaseOrigin(supabaseUrl);
  const googleAnalyticsEnabled = hasGoogleAnalyticsMeasurementId(googleAnalyticsMeasurementId);
  const connectSources = [
    "'self'",
    supabaseOrigin,
    ...(googleAnalyticsEnabled ? ['https://www.google-analytics.com', 'https://region1.google-analytics.com'] : []),
  ].filter((source): source is string => Boolean(source));
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(googleAnalyticsEnabled ? ['https://www.googletagmanager.com'] : []),
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

const contentSecurityPolicy = buildContentSecurityPolicy();

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
