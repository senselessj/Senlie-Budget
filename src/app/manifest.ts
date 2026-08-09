import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Senlie Budget',
    short_name: 'Senlie',
    description: 'Your money, clearly. Personal budgeting and expense management by Senlie Technologies.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F5F7',
    theme_color: '#5965F3',
    orientation: 'portrait-primary',
    categories: ['finance', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
