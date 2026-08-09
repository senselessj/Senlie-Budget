/**
 * Bubblewrap/TWA-specific manifest.
 *
 * The browser-facing manifest stays at /manifest.webmanifest. Bubblewrap is
 * intentionally given a smaller manifest with fully-qualified URLs because
 * some CLI URL parsing paths are stricter than Chromium's web-manifest parser.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  const manifest = {
    name: 'Senlie Budget',
    short_name: 'Senlie',
    description: 'Your money, clearly. Personal budgeting and expense management by Senlie Technologies.',
    start_url: `${origin}/`,
    scope: `${origin}/`,
    display: 'standalone',
    background_color: '#F5F5F7',
    theme_color: '#5965F3',
    orientation: 'portrait-primary',
    icons: [
      {
        src: `${origin}/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `${origin}/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: `${origin}/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
