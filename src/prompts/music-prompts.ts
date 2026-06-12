import type { MusicGenre } from '~/types'

export const getGenrePromptEnhancement = (genre: MusicGenre): string => {
  const genreDescriptions: Record<MusicGenre, string> = {
    rap: 'with hip-hop beats, rhythmic flow, and urban production',
    rock: 'with electric guitars, driving drums, and powerful energy',
    pop: 'with catchy melodies, modern production, and radio-friendly sound',
    country: 'with acoustic guitars, storytelling vocals, and Americana feel',
    folk: 'with acoustic instruments, organic sound, and traditional influences',
    jazz: 'with swing rhythms, improvisation, and sophisticated harmonies'
  }
  
  return genreDescriptions[genre] ?? 'with genre-appropriate instrumentation, structure, and production'
}
