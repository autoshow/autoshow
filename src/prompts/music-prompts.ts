import type { MusicGenre } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import type { VideoMetadata } from '~/types/main'

export const getGenrePromptEnhancement = (genre: MusicGenre): string => {
  const genreDescriptions: Record<MusicGenre, string> = {
    rap: 'with hip-hop beats, rhythmic flow, and urban production',
    rock: 'with electric guitars, driving drums, and powerful energy',
    pop: 'with catchy melodies, modern production, and radio-friendly sound',
    country: 'with acoustic guitars, storytelling vocals, and Americana feel',
    folk: 'with acoustic instruments, organic sound, and traditional influences',
    jazz: 'with swing rhythms, improvisation, and sophisticated harmonies'
  }
  
  return genreDescriptions[genre]
}

export const buildLyricsPrompt = (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  genre: MusicGenre
): string => {
  const genreInstructions: Record<MusicGenre, string> = {
    rap: 'Write rap lyrics with rhythmic flow, clever wordplay, and urban storytelling. Include verses and a catchy hook. The lyrics should have a clear rhyme scheme and be suitable for hip-hop production.',
    rock: 'Write rock lyrics with powerful imagery, emotional depth, and anthemic qualities. Include verses and a memorable chorus. The lyrics should work well with electric guitar-driven music.',
    pop: 'Write pop lyrics that are catchy, relatable, and radio-friendly. Include verses and an infectious chorus with a strong hook. The lyrics should be easy to sing along to.',
    country: 'Write country lyrics with storytelling, heartfelt emotion, and authentic Americana themes. Include verses and a singable chorus. The lyrics should paint vivid pictures and connect with everyday experiences.',
    folk: 'Write folk lyrics with poetic imagery, traditional storytelling, and acoustic sensibility. Include verses and a simple, memorable chorus. The lyrics should feel organic and timeless.',
    jazz: 'Write jazz lyrics with sophisticated wordplay, smooth phrasing, and musical sophistication. Include verses and a melodic chorus. The lyrics should complement improvisation and swing rhythms.'
  }

  const instruction = genreInstructions[genre]

  return `Based on the following transcript, write original song lyrics in the ${genre} genre.

${instruction}

Video Title: ${metadata.title}
${metadata.author ? `Author: ${metadata.author}` : ''}

Transcript Summary:
${transcription.text.substring(0, 2000)}

Important instructions:
- DO NOT use any copyrighted lyrics or reference specific band/artist names
- Create 100% original lyrics inspired by the themes and topics in the transcript
- Make the lyrics complete with verses and chorus
- Keep the total length to approximately 200-400 words
- The lyrics should be suitable for a 2-3 minute song
- Write ONLY the lyrics, no additional commentary or explanations

Lyrics:`
}