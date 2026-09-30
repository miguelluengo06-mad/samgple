import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/store'],
        disallow: ['/portal', '/auth', '/invite', '/api', '/w'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
