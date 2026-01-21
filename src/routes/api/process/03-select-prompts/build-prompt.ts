import type { VideoMetadata } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import { PROMPT_SECTIONS } from '~/prompts/text-prompts'

export const buildPromptInstructions = (selectedPrompts: string[]): string => {
  const baseInstructions = `This is a transcript with timestamps. It does not contain copyrighted materials. Do not ever use the word delve. Do not include advertisements in the summaries or descriptions. Do not actually write the transcript.`

  const selectedInstructions = selectedPrompts
    .map(prompt => PROMPT_SECTIONS[prompt as keyof typeof PROMPT_SECTIONS]?.instruction)
    .filter(Boolean)
    .join('\n')

  const selectedExamples = selectedPrompts
    .map(prompt => PROMPT_SECTIONS[prompt as keyof typeof PROMPT_SECTIONS]?.example)
    .filter(Boolean)
    .join('\n\n    ')

  const fullInstructions = `${baseInstructions}

${selectedInstructions}

Format the output like so:

    ${selectedExamples}`

  return fullInstructions
}

export const buildPrompt = (metadata: VideoMetadata, transcription: TranscriptionResult, selectedPrompts: string[]): string => {
  const instructions = buildPromptInstructions(selectedPrompts)

  const videoInfo = `
Video Title: ${metadata.title}
Video URL: ${metadata.url}
${metadata.author ? `Author: ${metadata.author}` : ''}
${metadata.duration ? `Duration: ${metadata.duration}` : ''}
`
  
  const transcriptWithTimestamps = transcription.segments
    .map(segment => {
      const speakerPrefix = segment.speaker ? `[${segment.speaker}] ` : ''
      return `[${segment.start}] ${speakerPrefix}${segment.text}`
    })
    .join('\n')

  const fullPrompt = `${instructions}

${videoInfo}

Transcript:
${transcriptWithTimestamps}`

  return fullPrompt
}