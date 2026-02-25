import * as v from 'valibot'
import type { IProgressTracker } from './progress-types'
import type { ServicesConfig } from './services-types'

export const MusicServiceTypeSchema = v.union([
  v.literal('elevenlabs'),
  v.literal('minimax')
])

export const MusicGenreSchema = v.pipe(v.string(), v.nonEmpty())
export const MusicPresetSchema = v.picklist(['cheap', 'balanced', 'quality'])
export const MusicSampleRateSchema = v.picklist([16000, 24000, 32000, 44100])
export const MusicBitrateSchema = v.picklist([32000, 64000, 128000, 256000])

export const MusicGenerationOptionsSchema = v.object({
  musicPreset: MusicPresetSchema,
  musicDurationSeconds: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)),
  musicInstrumental: v.boolean(),
  musicSampleRate: v.optional(MusicSampleRateSchema, undefined),
  musicBitrate: v.optional(MusicBitrateSchema, undefined)
})

export const Step7MetadataSchema = v.object({
  musicService: MusicServiceTypeSchema,
  musicModel: v.pipe(v.string(), v.nonEmpty()),
  selectedGenre: MusicGenreSchema,
  processingTime: v.pipe(v.number(), v.minValue(0)),
  musicFileName: v.pipe(v.string(), v.nonEmpty()),
  musicFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  musicDuration: v.pipe(v.number(), v.minValue(0)),
  lyricsLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
  lyricsGenerationTime: v.pipe(v.number(), v.minValue(0)),
  lyricsText: v.string(),
  totalCost: v.pipe(v.number(), v.minValue(0)),
  musicPreset: MusicPresetSchema,
  targetDurationSeconds: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)),
  instrumental: v.boolean(),
  sampleRate: v.optional(MusicSampleRateSchema, undefined),
  bitrate: v.optional(MusicBitrateSchema, undefined),
  musicS3Url: v.optional(v.string(), undefined)
})

export type MusicServiceType = v.InferOutput<typeof MusicServiceTypeSchema>
export type MusicGenre = v.InferOutput<typeof MusicGenreSchema>
export type MusicPreset = v.InferOutput<typeof MusicPresetSchema>
export type MusicSampleRate = v.InferOutput<typeof MusicSampleRateSchema>
export type MusicBitrate = v.InferOutput<typeof MusicBitrateSchema>
export type MusicGenerationOptions = v.InferOutput<typeof MusicGenerationOptionsSchema>
export type Step7Metadata = v.InferOutput<typeof Step7MetadataSchema>

export type MusicGenerator = (
  lyrics: string,
  outputDir: string,
  genre: MusicGenre,
  model: string,
  musicOptions: MusicGenerationOptions,
  progressTracker?: IProgressTracker
) => Promise<{ musicPath: string, metadata: Step7Metadata }>

export const musicServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  model: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  costPerMinute: v.pipe(v.number(), v.minValue(0)),
  genres: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string()
  })), v.minLength(1))
})

export type MusicConfig = ServicesConfig['music']
