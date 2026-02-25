import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, AssemblyTranscriptResponse, AssemblyTranscriptWord } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

const normalizeSpeaker = (speaker: string | number | undefined): string | undefined => {
  if (speaker === undefined || speaker === null) return undefined
  return `Speaker ${speaker}`
}

const groupWordsBySpeaker = (
  words: AssemblyTranscriptWord[]
): Array<{ speaker: string | undefined; text: string; start: number; end: number }> => {
  const groups: Array<{ speaker: string | undefined; text: string; start: number; end: number }> = []
  let currentGroup: { speaker: string | number | undefined; words: string[]; start: number; end: number } | null = null

  for (const word of words) {
    const speaker = word.speaker

    if (!currentGroup || currentGroup.speaker !== speaker) {
      if (currentGroup) {
        groups.push({
          speaker: normalizeSpeaker(currentGroup.speaker),
          text: currentGroup.words.join(' '),
          start: currentGroup.start,
          end: currentGroup.end
        })
      }
      currentGroup = {
        speaker,
        words: [word.text],
        start: word.start,
        end: word.end
      }
    } else {
      currentGroup.words.push(word.text)
      currentGroup.end = word.end
    }
  }

  if (currentGroup) {
    groups.push({
      speaker: normalizeSpeaker(currentGroup.speaker),
      text: currentGroup.words.join(' '),
      start: currentGroup.start,
      end: currentGroup.end
    })
  }

  return groups
}

export const parseAssemblyOutput = (
  response: AssemblyTranscriptResponse,
  offsetMinutes: number = 0
): { text: string; segments: TranscriptionSegment[] } => {
  const segments: TranscriptionSegment[] = []
  let fullText = ''

  if (response.utterances && response.utterances.length > 0) {
    const textParts: string[] = []

    for (const utterance of response.utterances) {
      const startSeconds = utterance.start / 1000
      const endSeconds = utterance.end / 1000
      const speaker = normalizeSpeaker(utterance.speaker)

      const formattedStart = formatTimestamp(startSeconds)
      const formattedEnd = formatTimestamp(endSeconds)

      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: utterance.text,
        speaker
      })

      textParts.push(utterance.text)
    }

    fullText = textParts.join(' ')
  } else if (response.words && response.words.length > 0) {
    const groups = groupWordsBySpeaker(response.words)
    const textParts: string[] = []

    for (const group of groups) {
      const startSeconds = group.start / 1000
      const endSeconds = group.end / 1000

      const formattedStart = formatTimestamp(startSeconds)
      const formattedEnd = formatTimestamp(endSeconds)

      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: group.text,
        speaker: group.speaker
      })

      textParts.push(group.text)
    }

    fullText = textParts.join(' ')
  } else if (response.text) {
    fullText = response.text
    segments.push({
      start: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      end: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      text: response.text,
      speaker: undefined
    })
  }

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed AssemblyAI transcript', {
    utteranceCount: response.utterances?.length ?? 0,
    wordCount: response.words?.length ?? 0,
    segmentCount: segments.length,
    transcriptLength: fullText.length,
    speakerCount: speakerSet.size
  })

  return {
    text: fullText,
    segments
  }
}
