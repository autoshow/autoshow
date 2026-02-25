import type { MusicConfig, MusicGenre, MusicServiceType } from '~/types'

export const MUSIC_CONFIG: MusicConfig = {
  elevenlabs: {
    name: "Eleven Music",
    model: "music_v1",
    description: "Studio-grade music generation with natural language prompts",
    costPerMinute: 0.80,
    genres: [
      { id: "pop", name: "Pop", description: "Catchy melodies with modern production and radio-friendly sound" },
      { id: "rock", name: "Rock", description: "Electric guitars with driving drums and powerful energy" },
      { id: "rap", name: "Rap", description: "Hip-hop beats with rhythmic flow and urban production" },
      { id: "country", name: "Country", description: "Acoustic guitars with storytelling vocals and Americana feel" },
      { id: "folk", name: "Folk", description: "Acoustic instruments with organic sound and traditional influences" },
      { id: "jazz", name: "Jazz", description: "Swing rhythms with improvisation and sophisticated harmonies" }
    ]
  },
  minimax: {
    name: "MiniMax Music",
    model: "music-2.5",
    description: "High-quality music generation with structured lyrics support",
    costPerMinute: 0.5,
    genres: [
      { id: "pop", name: "Pop", description: "Catchy melodies with modern production" },
      { id: "rock", name: "Rock", description: "Electric guitars with driving drums" },
      { id: "rap", name: "Rap", description: "Hip-hop beats with rhythmic flow" },
      { id: "country", name: "Country", description: "Acoustic guitars with storytelling vocals" },
      { id: "electronic", name: "Electronic", description: "Synthesized beats and modern sound" },
      { id: "jazz", name: "Jazz", description: "Swing rhythms with sophisticated harmonies" }
    ]
  }
}

export const getDefaultMusicService = (): MusicServiceType => {
  const services = Object.keys(MUSIC_CONFIG) as MusicServiceType[]
  const firstService = services[0]
  if (!firstService) {
    throw new Error('No music services configured')
  }
  return firstService
}

const getResolvedMusicService = (service?: MusicServiceType): MusicServiceType => {
  if (service && MUSIC_CONFIG[service]) return service
  return getDefaultMusicService()
}

export const getMusicModelsForService = (service: MusicServiceType): string[] => {
  const config = MUSIC_CONFIG[service]
  if (!config) return []
  return [config.model]
}

export const getDefaultMusicModelForService = (service: MusicServiceType): string => {
  return getMusicModelsForService(service)[0] || ''
}

export const isValidMusicModel = (service: MusicServiceType, model: string): boolean => {
  return getMusicModelsForService(service).includes(model)
}

export const getMusicGenres = (service?: MusicServiceType): MusicGenre[] => {
  const config = MUSIC_CONFIG[getResolvedMusicService(service)]
  return config.genres.map(g => g.id as MusicGenre)
}

export const getDefaultMusicGenre = (service?: MusicServiceType): MusicGenre => {
  const config = MUSIC_CONFIG[getResolvedMusicService(service)]
  const firstGenre = config.genres[0]?.id
  if (!firstGenre) {
    throw new Error('No music genres configured')
  }
  return firstGenre as MusicGenre
}
