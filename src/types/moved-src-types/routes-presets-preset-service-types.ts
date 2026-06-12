import type { PresetRecord } from '~/types'
export type SourceRoutesPresetsPresetServicePresetsResponse = {
  presets?: PresetRecord[]
  error?: string
}

export type SourceRoutesPresetsPresetServicePresetResponse = {
  preset?: PresetRecord
  error?: string
}

export type SourceRoutesPresetsPresetServiceDeletePresetResponse = {
  success?: boolean
  error?: string
}
