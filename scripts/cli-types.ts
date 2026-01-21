export type NetworkRequest = {
  url: string
  resourceType: string
  size: number
  status: number
}

export type BundleAnalysis = {
  jsFiles: number
  cssFiles: number
  totalSize: number
  largestBundle: { name: string; size: number }
  hasCodeSplitting: boolean
  recommendations: string[]
}

export type CSSAnalysis = {
  totalStylesheets: number
  hasCriticalCSS: boolean
  unusedBytes: number
  recommendations: string[]
}

export type LazyLoadingAnalysis = {
  imagesTotal: number
  imagesLazy: number
  scriptsTotal: number
  scriptsDeferred: number
  recommendations: string[]
}

export type PerformanceMetrics = {
  fcp: number | undefined
  lcp: number | undefined
  domContentLoaded: number
  load: number
}

export type BuildAnalysisResult = {
  timestamp: string
  buildDuration: number
  performance: PerformanceMetrics
  bundle: BundleAnalysis
  css: CSSAnalysis
  lazyLoading: LazyLoadingAnalysis
  networkRequests: NetworkRequest[]
  score: number
  grade: string
  recommendations: string[]
}

export type DirectorySizes = Record<string, number>

export type VolumeInfo = {
  name: string
  size: string
}

export type HistoryEntry = {
  image: string
  size: number
  timestamp: number
}

export type TarHeader = {
  name: string
  size: number
  type: string
}

export type TarAnalysisResult = {
  dirSizes: DirectorySizes
  devTools: string[]
  libSize: number
}