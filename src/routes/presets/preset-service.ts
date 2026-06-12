import type {
SourceRoutesPresetsPresetServiceDeletePresetResponse as DeletePresetResponse,PresetCompatibilityKey,
PresetConfig,
PresetPatchBody,
PresetRecord,SourceRoutesPresetsPresetServicePresetResponse as PresetResponse,SourceRoutesPresetsPresetServicePresetsResponse as PresetsResponse
} from '~/types'

async function readJson<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T
  } catch {
    return {} as T
  }
}

function sortPresets(items: PresetRecord[]): PresetRecord[] {
  return [...items].sort((a, b) => {
    const updatedDiff = b.updatedAt - a.updatedAt
    return updatedDiff === 0 ? a.name.localeCompare(b.name) : updatedDiff
  })
}

function assertPresetResponse(response: Response, data: PresetResponse, fallback: string): PresetRecord {
  if (!response.ok || !data.preset) {
    throw new Error(data.error || fallback)
  }

  return data.preset
}

export async function fetchPresets(): Promise<PresetRecord[]> {
  const response = await fetch("/api/presets")
  const data = await readJson<PresetsResponse>(response)
  if (!response.ok) {
    throw new Error(data.error || "Failed to load presets")
  }

  return sortPresets(data.presets ?? [])
}

export async function createPresetApi(
  name: string,
  config: PresetConfig,
  version = 1
): Promise<PresetRecord> {
  const response = await fetch("/api/presets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, config, version }),
  })
  const data = await readJson<PresetResponse>(response)
  return assertPresetResponse(response, data, "Failed to save preset")
}

export async function updatePresetApi(id: string, patch: PresetPatchBody): Promise<PresetRecord> {
  const response = await fetch(`/api/presets/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  })
  const data = await readJson<PresetResponse>(response)
  return assertPresetResponse(response, data, "Failed to update preset")
}

export async function deletePresetApi(id: string): Promise<void> {
  const response = await fetch(`/api/presets/${id}`, {
    method: "DELETE",
  })
  const data = await readJson<DeletePresetResponse>(response)
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to delete preset")
  }
}

export function formatCompatibilityKey(key: PresetCompatibilityKey): string {
  switch (key) {
    case "document":
      return "Document"
    case "audio-file":
      return "Uploaded file or direct-file URL"
    case "audio-streaming":
      return "YouTube or streaming URL"
  }
}

export function describePresetOutputs(preset: PresetRecord): string {
  const outputs: string[] = []

  if (preset.config.llmEnabled) {
    outputs.push(`LLM (${preset.config.selectedPrompts.length})`)
  }
  if (preset.config.ttsWithLlm) {
    outputs.push("TTS")
  }
  if (preset.config.imageEnabled) {
    outputs.push(`Image (${preset.config.selectedImagePrompts.length})`)
  }
  if (preset.config.musicEnabled) {
    outputs.push("Music")
  }
  if (preset.config.videoEnabled) {
    outputs.push(`Video (${preset.config.selectedVideoPrompts.length})`)
  }

  return outputs.length > 0 ? outputs.join(" · ") : "No outputs enabled"
}

export function describePresetSourceConfig(preset: PresetRecord): string {
  if (preset.compatibilityKey === "document") {
    return `${preset.config.documentService} / ${preset.config.documentModel}`
  }

  return `${preset.config.transcriptionOption} / ${preset.config.transcriptionModel}`
}
