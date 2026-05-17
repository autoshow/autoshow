import type { TestDefinition } from "~/types"

export const KNOWN_DURATIONS_SEC: Record<string, number> = {
  "1.mp3": 60,
  "5.mp3": 300,
  "10.mp3": 600,
  "20.mp3": 1200,
  "fsjam-short.mp3": 66,
  "variant:1m-streaming": 60,
  "variant:2m-streaming": 120,
  "youtube:nXtaETBZ29g": 60,
  "youtube:MORMZXEaONk": 60,
}

export const KNOWN_PAGE_COUNTS: Record<string, number> = {
  "1.pdf": 1,
  "1.png": 1,
  "3.pdf": 3,
  "textract-1.pdf": 1,
  "textract-10.pdf": 10,
}

function getInputSource(def: TestDefinition): string | null {
  return def.input.type === "local" ? def.input.path ?? null : def.input.url ?? null
}

function getPathBasename(pathLike: string): string | null {
  const trimmed = pathLike.trim()
  if (!trimmed) return null

  const sanitized = trimmed.split(/[?#]/, 1)[0] ?? trimmed
  const basename = sanitized.split("/").filter(Boolean).pop()
  return basename ? decodeURIComponent(basename) : null
}

function getYouTubeLookupKey(url: URL): string | null {
  const hostname = url.hostname.toLowerCase()

  if (hostname === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean).pop()
    return videoId ? `youtube:${videoId}` : null
  }

  if (hostname === "youtube.com" || hostname === "www.youtube.com") {
    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v")
      return videoId ? `youtube:${videoId}` : null
    }

    const pathParts = url.pathname.split("/").filter(Boolean)
    if (pathParts[0] === "shorts" && pathParts[1]) {
      return `youtube:${pathParts[1]}`
    }
  }

  return null
}

function getVariantLookupKey(def: TestDefinition): string | null {
  const tags = new Set(def.tags)
  const durationTag = ["1m", "2m", "5m", "10m", "20m"].find(tag => tags.has(tag))
  const sourceTag = ["local", "direct", "streaming"].find(tag => tags.has(tag))

  if (!durationTag || !sourceTag) {
    return null
  }

  return `variant:${durationTag}-${sourceTag}`
}

function getInputLookupKeys(def: TestDefinition): string[] {
  const source = getInputSource(def)
  if (!source) return []

  const keys: string[] = []
  const seen = new Set<string>()
  const addKey = (key: string | null) => {
    if (!key || seen.has(key)) return
    seen.add(key)
    keys.push(key)
  }

  addKey(getVariantLookupKey(def))
  const basename = getPathBasename(source)
  addKey(basename)

  if (def.input.type === "local") {
    return keys
  }

  try {
    const url = new URL(source)
    const urlBasename = getPathBasename(url.pathname)
    addKey(urlBasename)

    const youTubeKey = getYouTubeLookupKey(url)
    addKey(youTubeKey)
  } catch {}

  return keys
}

export function findKnownInputSize(
  def: TestDefinition,
  lookup: Record<string, number>,
): { value: number | null; matchedKey: string | null; source: string | null } {
  const source = getInputSource(def)
  if (!source) {
    return { value: null, matchedKey: null, source: null }
  }

  for (const key of getInputLookupKeys(def)) {
    const value = lookup[key]
    if (value !== undefined) {
      return { value, matchedKey: key, source }
    }
  }

  return { value: null, matchedKey: null, source }
}
