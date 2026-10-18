import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cart', '/order/', '/staff', '/t/', '/login', '/pos', '/waiter', '/kitchen', '/print'] }], sitemap: base + '/sitemap.xml' };
}
