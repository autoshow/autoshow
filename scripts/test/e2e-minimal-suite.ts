import { resolveTestDefinitionPaths } from "./e2e-paths"

// This list preserves the original "minimal" intent as a curated subset of
// representative verify cases, without relying on drift-prone JSON tags.
export const CURATED_MINIMAL_E2E_DEFINITION_PATHS = [
  "tests/test-definitions/verify/document/verify-document-mistral-ocr.json",
  "tests/test-definitions/verify/image/verify-image-gemini-25flash.json",
  "tests/test-definitions/verify/image/verify-image-openai-gptimage1mini.json",
  "tests/test-definitions/verify/llm/verify-llm-claude-haiku45.json",
  "tests/test-definitions/verify/llm/verify-llm-gemini-31flashlite.json",
  "tests/test-definitions/verify/llm/verify-llm-groq-gptoss20b.json",
  "tests/test-definitions/verify/llm/verify-llm-openai-gpt54nano.json",
  "tests/test-definitions/verify/music/verify-music-elevenlabs-musicv1.json",
  "tests/test-definitions/verify/transcription/streaming/verify-transcription-gladia-v2.json",
  "tests/test-definitions/verify/transcription/streaming/verify-transcription-happyscribe-auto.json",
  "tests/test-definitions/verify/transcription/streaming/verify-transcription-youtube-captions.json",
  "tests/test-definitions/verify/transcription/whisper/verify-transcription-deepinfra-whisperv3turbo.json",
  "tests/test-definitions/verify/transcription/whisper/verify-transcription-groq-whisperv3turbo.json",
  "tests/test-definitions/verify/tts/verify-tts-elevenlabs-flash25.json",
  "tests/test-definitions/verify/tts/verify-tts-groq-orpheusv1.json",
  "tests/test-definitions/verify/tts/verify-tts-openai-gpt4ominitts.json",
  "tests/test-definitions/verify/video/verify-video-gemini-veo31fast.json",
  "tests/test-definitions/verify/video/verify-video-runway-gen45.json",
] as const

export const CURATED_MINIMALIST_E2E_DEFINITION_PATHS = [
  "tests/test-definitions/verify/document/verify-document-mistral-ocr.json",
  "tests/test-definitions/verify/image/verify-image-gemini-25flash.json",
  "tests/test-definitions/verify/llm/verify-llm-claude-haiku45.json",
  "tests/test-definitions/verify/music/verify-music-elevenlabs-musicv1.json",
  "tests/test-definitions/verify/transcription/streaming/verify-transcription-youtube-captions.json",
  "tests/test-definitions/verify/transcription/whisper/verify-transcription-deepinfra-whisperv3turbo.json",
  "tests/test-definitions/verify/tts/verify-tts-elevenlabs-flash25.json",
  "tests/test-definitions/verify/tts/verify-tts-groq-orpheusv1.json",
  "tests/test-definitions/verify/video/verify-video-runway-gen45.json",
] as const

export async function resolveCuratedMinimalE2EDefinitionPaths(): Promise<string[]> {
  const definitionPaths = await resolveTestDefinitionPaths([
    ...CURATED_MINIMAL_E2E_DEFINITION_PATHS,
  ])

  if (definitionPaths.length !== CURATED_MINIMAL_E2E_DEFINITION_PATHS.length) {
    const missingPaths = CURATED_MINIMAL_E2E_DEFINITION_PATHS.filter(
      definitionPath => !definitionPaths.includes(definitionPath)
    )
    throw new Error(
      `Curated minimal E2E definition list is out of sync with the repo: ${missingPaths.join(", ")}`
    )
  }

  return definitionPaths
}

export async function resolveCuratedMinimalistE2EDefinitionPaths(): Promise<string[]> {
  const definitionPaths = await resolveTestDefinitionPaths([
    ...CURATED_MINIMALIST_E2E_DEFINITION_PATHS,
  ])

  if (definitionPaths.length !== CURATED_MINIMALIST_E2E_DEFINITION_PATHS.length) {
    const missingPaths = CURATED_MINIMALIST_E2E_DEFINITION_PATHS.filter(
      definitionPath => !definitionPaths.includes(definitionPath)
    )
    throw new Error(
      `Curated minimalist E2E definition list is out of sync with the repo: ${missingPaths.join(", ")}`
    )
  }

  return definitionPaths
}
