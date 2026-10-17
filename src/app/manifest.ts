import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MANGO — milliy taomlar',
    short_name: 'MANGO',
    description: 'Shashlik, brizol va milliy taomlar. Yangiyoʻl.',
    start_url: '/',
    display: 'standalone',
    background_color: '#140E0B',
    theme_color: '#140E0B',
    icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
  };
}
