/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pg'],
  },
  async redirects() {
    // the old staff screens moved: keep bookmarks and kiosk shortcuts working
    return [
      { source: '/staff', destination: '/pos', permanent: false },
      { source: '/staff/pos', destination: '/pos', permanent: false },
      { source: '/staff/kitchen', destination: '/kitchen', permanent: false },
      { source: '/staff/print', destination: '/print', permanent: false },
      { source: '/staff/tables', destination: '/admin/tables', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
      // staff screens are never framed; the guest site may open inside Telegram (Mini App, including Telegram Web)
      {
        source: '/:path((?!admin|pos|waiter|kitchen|print|courier|dispatch|login|api).*)',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org" }],
      },
      {
        source: '/:path(admin|pos|waiter|kitchen|print|courier|dispatch|login|api)/:rest*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      {
        source: '/:path(admin|pos|waiter|kitchen|print|courier|dispatch|login)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      { source: '/art/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;
