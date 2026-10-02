import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      '@supabase/supabase-js',
    ],
  },
  // La web no usa el optimizador de imágenes: sin dominios remotos permitidos (evita que se use como proxy)
  images: {
    remotePatterns: [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  output: 'standalone',
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error'],
      },
    },
  }),
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      // Next.js inline scripts require 'unsafe-inline'; this still blocks external script injection.
      // connect-src must allow the Supabase project directly: the browser client (src/lib/supabase.ts)
      // is initialized with NEXT_PUBLIC_SUPABASE_URL and calls it cross-origin (auth, REST, storage,
      // realtime) — without this, every supabase-js call (signUp, signInWithPassword, etc.) is silently
      // blocked by the browser itself and surfaces as a generic "Failed to fetch".
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "media-src 'self' https://pub-e87160a916994231bb484c99e8e7ef01.r2.dev",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.facebook.com https://connect.facebook.net",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://checkout.stripe.com",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      }
    ];
  },
};

export default nextConfig;
