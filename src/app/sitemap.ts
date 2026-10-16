import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  return ['', '/menu', '/story', '/contacts'].map((p) => ({ url: base + p, changeFrequency: 'weekly', priority: p ? 0.8 : 1 }));
}
