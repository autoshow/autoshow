import type { SourceUtilsSecuritySecurityConfigResolvedPublicHttpUrl as ResolvedPublicHttpUrl } from '~/types'
export type SourceUtilsSecurityPublicHttpRequestMethod = 'GET' | 'HEAD'

export type SourceUtilsSecurityPublicHttpOpenPublicHttpResponseOptions = {
  method?: SourceUtilsSecurityPublicHttpRequestMethod
  headers?: Record<string, string>
  maxRedirects?: number
  timeoutMs?: number
}

export type SourceUtilsSecurityPublicHttpPublicHttpRequestOptions = SourceUtilsSecurityPublicHttpOpenPublicHttpResponseOptions & {
  maxBytes: number
}

export type SourceUtilsSecurityPublicHttpOpenPublicHttpResponseResult = {
  resolved: ResolvedPublicHttpUrl
  response: Response
  status: number
  headers: Record<string, string>
}

export type SourceUtilsSecurityPublicHttpPublicHttpResponse = {
  url: string
  status: number
  headers: Record<string, string>
  body: Uint8Array
}

export type SourceUtilsSecurityPublicHttpDownloadPublicHttpFileResult = {
  url: string
  status: number
  headers: Record<string, string>
}
