import { getPublicDiscoveryDocuments } from '~/utils/agent-discovery'
import { getCanonicalSiteUrl } from '~/utils/site-url'

export function GET() {
  const siteUrl = getCanonicalSiteUrl()
  const publicDocuments = getPublicDiscoveryDocuments(siteUrl)

  const body = [
    '# AutoShow',
    '',
    'AutoShow turns audio, video, and documents into transcripts, structured text, narrated audio, images, music, and short video outputs.',
    '',
    `Canonical site URL: ${siteUrl}`,
    '',
    'Start here:',
    `- ${siteUrl}/`,
    `- ${siteUrl}/llms.txt`,
    `- ${siteUrl}/sitemap.md`,
    '',
    'Public routes:',
    ...publicDocuments.map(document => `- ${document.href} (${document.mimeType}) - ${document.summary}`),
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    }
  })
}
