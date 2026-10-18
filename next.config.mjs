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
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
      { source: '/art/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;
