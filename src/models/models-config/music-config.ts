import { attachModelEstimations,buildMusicModelEstimation } from '~/models/models-utils/estimate-speed'
import { createMusicSpeedProfile } from '~/models/models-utils/speed'
import type { MusicConfig,MusicGenre,MusicServiceType } from '~/types'

export const MUSIC_CONFIG: MusicConfig = {
  elevenlabs: {
    name: "Eleven Music",
    description: "Studio-grade music generation with natural language prompts",
    models: attachModelEstimations([
      {
        id: "music_v1",
        name: "music_v1",
        description: "Studio-grade music generation with natural language prompts",
        speedProfile: createMusicSpeedProfile(5_000, 50),
        quality: "A",
        costPerMinute: 0.80
      }
    ], buildMusicModelEstimation),
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
    description: "High-quality music generation with structured lyrics support",
    models: attachModelEstimations([
      {
        id: "music-2.5",
        name: "music-2.5",
        description: "High-quality music generation with structured lyrics support",
        speedProfile: createMusicSpeedProfile(60_000, 300),
        quality: "A",
        costPerMinute: 0.5
      }
    ], buildMusicModelEstimation),
    genres: [
      { id: "pop", name: "Pop", description: "Catchy melodies with modern production" },
      { id: "rock", name: "Rock", description: "Electric guitars with driving drums" },
      { id: "rap", name: "Rap", description: "Hip-hop beats with rhythmic flow" },
      { id: "country", name: "Country", description: "Acoustic guitars with storytelling vocals" },
      { id: "electronic", name: "Electronic", description: "Synthesized beats and modern sound" },
      { id: "jazz", name: "Jazz", description: "Swing rhythms with sophisticated harmonies" }
    ]
  },
  deapi: {
    name: "deAPI Music",
    description: "Queued music generation through deAPI with lyric-guided composition",
    models: attachModelEstimations([
      {
        id: "AceStep_1_5_Turbo",
        name: "AceStep_1_5_Turbo",
        description: "Queued music generation through deAPI with lyric-guided composition",
        speedProfile: createMusicSpeedProfile(18_000, 120),
        quality: "B",
        costPerMinute: 0.10
      }
    ], buildMusicModelEstimation),
    genres: [
      { id: "pop", name: "Pop", description: "Catchy melodies with polished mainstream production" },
      { id: "rock", name: "Rock", description: "Guitars and drums with energetic momentum" },
      { id: "rap", name: "Rap", description: "Rhythmic beats and vocal-forward hip-hop styling" },
      { id: "country", name: "Country", description: "Storytelling Americana with acoustic textures" },
      { id: "electronic", name: "Electronic", description: "Synth-driven grooves and modern textures" },
      { id: "jazz", name: "Jazz", description: "Improvisational harmony with swung rhythm" }
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

const getMusicModelConfigsForService = (service: MusicServiceType) => {
  const config = MUSIC_CONFIG[service]
  return config?.models ?? []
}

const getMusicModelsForService = (service: MusicServiceType): string[] => {
  return getMusicModelConfigsForService(service).map(model => model.id)
}

export const getDefaultMusicModelForService = (service: MusicServiceType): string => {
  return getMusicModelsForService(service)[0] || ''
}

export const isValidMusicModel = (service: MusicServiceType, model: string): boolean => {
  return getMusicModelsForService(service).includes(model)
}

export const getDefaultMusicGenre = (service?: MusicServiceType): MusicGenre => {
  const config = MUSIC_CONFIG[getResolvedMusicService(service)]
  const firstGenre = config.genres[0]?.id
  if (!firstGenre) {
    throw new Error('No music genres configured')
  }
  return firstGenre as MusicGenre
}
