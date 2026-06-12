import { getCanonicalSiteUrl } from '~/utils/site-url'

export function GET() {
  const siteUrl = getCanonicalSiteUrl()

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Sitemap: ${siteUrl}/sitemap.md`,
    ''
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
