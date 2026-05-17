export type SourceUtilsSecuritySecurityConfigUrlValidationDiagnostics = {
  dnsLookup_ms: number
  recordCount: number
  primaryAddress: string
}

export type SourceUtilsSecuritySecurityConfigUrlSafetyResult =
  | { safe: true; url: string, resolved: SourceUtilsSecuritySecurityConfigResolvedPublicHttpUrl, diagnostics?: SourceUtilsSecuritySecurityConfigUrlValidationDiagnostics }
  | { safe: false; error: string }

export type SourceUtilsSecuritySecurityConfigAddressFamily = 'ipv4' | 'ipv6'

export type SourceUtilsSecuritySecurityConfigResolvedIpFamily = 4 | 6

export type SourceUtilsSecuritySecurityConfigPrivateAddressTools = {
  isIP(address: string): number
  isBlocked(address: string, family: SourceUtilsSecuritySecurityConfigAddressFamily): boolean
}

export type SourceUtilsSecuritySecurityConfigResolvedPublicHttpUrl = {
  url: string
  hostname: string
  port: number
  address: string
  family: SourceUtilsSecuritySecurityConfigResolvedIpFamily
}

export type SourceUtilsSecuritySecurityConfigSecurityHeadersOptions = {
  nonce?: string
  env?: NodeJS.ProcessEnv
}

export type SourceUtilsSecuritySecurityConfigParsedUrlCheck =
  | { ok: true; parsed: URL }
  | { ok: false; reason: string }
