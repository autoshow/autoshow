import type { SourceUtilsAgentDiscoveryDiscoveryDocument as DiscoveryDocument } from '~/types'
import { buildAbsoluteUrl,getCanonicalSiteUrl } from '~/utils/site-url'

export const getPublicDiscoveryDocuments = (
  siteUrl = getCanonicalSiteUrl()
): DiscoveryDocument[] => [
  {
    href: buildAbsoluteUrl('/', siteUrl),
    path: '/',
    title: 'Homepage',
    summary: 'Public overview of AutoShow capabilities, supported inputs, and the processing pipeline.',
    mimeType: 'text/html',
  },
  {
    href: buildAbsoluteUrl('/llms.txt', siteUrl),
    path: '/llms.txt',
    title: 'Agent hint surface',
    summary: 'Plain-text overview of public AutoShow pages.',
    mimeType: 'text/plain',
  },
  {
    href: buildAbsoluteUrl('/sitemap.md', siteUrl),
    path: '/sitemap.md',
    title: 'Markdown discovery index',
    summary: 'Markdown index of public AutoShow pages.',
    mimeType: 'text/markdown',
  },
  {
    href: buildAbsoluteUrl('/sitemap.xml', siteUrl),
    path: '/sitemap.xml',
    title: 'XML sitemap',
    summary: 'Search-oriented sitemap for public crawlable pages and machine-readable discovery routes.',
    mimeType: 'application/xml',
  },
  {
    href: buildAbsoluteUrl('/robots.txt', siteUrl),
    path: '/robots.txt',
    title: 'Robots policy',
    summary: 'Crawler policy for public AutoShow pages.',
    mimeType: 'text/plain',
  },
]
