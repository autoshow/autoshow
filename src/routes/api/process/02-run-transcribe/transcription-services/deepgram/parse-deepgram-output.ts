import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, DeepgramResponse, DeepgramWord } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

const normalizeSpeaker = (speaker: number | undefined): string | undefined => {
  if (speaker === undefined || speaker === null) return undefined
  return `Speaker ${speaker}`
}

const groupWordsBySpeaker = (
  words: DeepgramWord[]
): Array<{ speaker: string | undefined; text: string; start: number; end: number }> => {
  const groups: Array<{ speaker: string | undefined; text: string; start: number; end: number }> = []
  let currentGroup: { speaker: number | undefined; words: string[]; start: number; end: number } | null = null

  for (const word of words) {
    const speaker = word.speaker
    const wordText = word.punctuated_word || word.word || ''

    if (!wordText) continue

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
        words: [wordText],
        start: word.start,
        end: word.end
      }
    } else {
      currentGroup.words.push(wordText)
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

export const parseDeepgramOutput = (
  response: DeepgramResponse,
  offsetMinutes: number = 0
): { text: string; segments: TranscriptionSegment[] } => {
  const segments: TranscriptionSegment[] = []
  let fullText = ''

  if (response.results.utterances && response.results.utterances.length > 0) {
    const textParts: string[] = []

    for (const utterance of response.results.utterances) {
      const speaker = normalizeSpeaker(utterance.speaker)

      const formattedStart = formatTimestamp(utterance.start)
      const formattedEnd = formatTimestamp(utterance.end)

      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: utterance.transcript || '',
        speaker
      })

      if (utterance.transcript) {
        textParts.push(utterance.transcript)
      }
    }

    fullText = textParts.join(' ')
  } else if (
    response.results.channels[0]?.alternatives[0]?.words &&
    response.results.channels[0].alternatives[0].words.length > 0
  ) {
    const words = response.results.channels[0].alternatives[0].words
    const groups = groupWordsBySpeaker(words)
    const textParts: string[] = []

    for (const group of groups) {
      const formattedStart = formatTimestamp(group.start)
      const formattedEnd = formatTimestamp(group.end)

      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: group.text,
        speaker: group.speaker
      })

      textParts.push(group.text)
    }

    fullText = textParts.join(' ')
  } else if (response.results.channels[0]?.alternatives[0]?.transcript) {
    fullText = response.results.channels[0].alternatives[0].transcript
    segments.push({
      start: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      end: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      text: fullText,
      speaker: undefined
    })
  }

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed Deepgram transcript', {
    utteranceCount: response.results.utterances?.length ?? 0,
    channelCount: response.results.channels.length,
    segmentCount: segments.length,
    transcriptLength: fullText.length,
    speakerCount: speakerSet.size
  })

  return {
    text: fullText,
    segments
  }
}
