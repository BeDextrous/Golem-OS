import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Golem OS',
    short_name: 'Golem',
    description: 'Your personal life operating system',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#1c1917',
    theme_color: '#1c1917',
    categories: ['productivity', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        // @ts-expect-error — 'purpose' is valid per W3C spec but not yet typed in Next.js
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        // @ts-expect-error — same
        purpose: 'any maskable',
      },
    ],
  }
}
