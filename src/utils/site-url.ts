const DEFAULT_SITE_URL = 'http://localhost:4321'

const normalizeSiteUrl = (rawUrl: string): string => {
  const parsed = new URL(rawUrl)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Site URL must use http or https')
  }

  if (parsed.username || parsed.password) {
    throw new Error('Site URL must not include credentials')
  }

  const pathname = parsed.pathname.replace(/\/+$/, '')
  const basePath = pathname === '' || pathname === '/' ? '' : pathname
  return `${parsed.origin}${basePath}`
}

const getSiteUrlCandidates = (): string[] => {
  const processEnv = typeof process !== 'undefined' ? process.env : undefined

  return [
    import.meta.env?.VITE_SITE_URL,
    processEnv?.VITE_SITE_URL,
    DEFAULT_SITE_URL,
  ]
    .map(candidate => candidate?.trim() ?? '')
    .filter((candidate): candidate is string => candidate.length > 0)
}

export const getCanonicalSiteUrl = (): string => {
  for (const candidate of getSiteUrlCandidates()) {
    try {
      return normalizeSiteUrl(candidate)
    } catch {
    }
  }

  return DEFAULT_SITE_URL
}

export const buildAbsoluteUrl = (
  pathname: string,
  siteUrl = getCanonicalSiteUrl()
): string => `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
