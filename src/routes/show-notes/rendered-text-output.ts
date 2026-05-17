import { PROMPT_CONFIG,PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import type { RenderedAssetTextOutputMaps,RenderedTextOutputMap,ShowNoteAsset,StructuredLLMResponse } from "~/types"
import { renderMarkdownToHtml } from "./markdown-renderer"

type TextOutputSource = Record<string, unknown>

const parseJsonRecord = (value: string | null | undefined): TextOutputSource | null => {
  if (!value?.trim()) return null

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as TextOutputSource
      : null
  } catch {
    return null
  }
}

const parseTextOutputValue = (value: unknown): TextOutputSource | null => {
  if (typeof value === 'string') {
    return parseJsonRecord(value)
  }

  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as TextOutputSource
    : null
}

const parseAssetMetadata = (metadataJson: string | null | undefined): TextOutputSource | null => {
  return parseJsonRecord(metadataJson)
}

export const renderStructuredTextOutput = (
  textOutput: StructuredLLMResponse | TextOutputSource | null
): RenderedTextOutputMap => {
  const rendered: RenderedTextOutputMap = {}
  if (!textOutput) return rendered

  for (const promptType of PROMPT_TYPES) {
    if (PROMPT_CONFIG[promptType].renderType !== 'text') continue

    const value = textOutput[promptType]
    if (typeof value !== 'string') continue

    rendered[promptType] = renderMarkdownToHtml(value)
  }

  return rendered
}

export const renderTextOutputJson = (
  textOutputJson: string | null | undefined
): RenderedTextOutputMap => {
  return renderStructuredTextOutput(parseJsonRecord(textOutputJson))
}

export const renderAssetTextOutputMaps = (
  assets: Array<Pick<ShowNoteAsset, 'id' | 'kind' | 'metadata_json'>>
): RenderedAssetTextOutputMaps => {
  const rendered: RenderedAssetTextOutputMaps = {}

  for (const asset of assets) {
    if (asset.kind !== 'llm') continue

    const metadata = parseAssetMetadata(asset.metadata_json)
    const textOutput = parseTextOutputValue(metadata?.textOutput)
    const renderedTextOutput = renderStructuredTextOutput(textOutput)

    if (Object.keys(renderedTextOutput).length > 0) {
      rendered[asset.id] = renderedTextOutput
    }
  }

  return rendered
}

export const renderShowNoteTextOutputMaps = (
  textOutputJson: string | null | undefined,
  assets: Array<Pick<ShowNoteAsset, 'id' | 'kind' | 'metadata_json'>>
): {
  renderedTextOutput: RenderedTextOutputMap
  renderedAssetTextOutputs: RenderedAssetTextOutputMaps
} => {
  return {
    renderedTextOutput: renderTextOutputJson(textOutputJson),
    renderedAssetTextOutputs: renderAssetTextOutputMaps(assets),
  }
}
