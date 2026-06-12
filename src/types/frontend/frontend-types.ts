import type * as v from 'valibot'
import type { ServicesConfigSchema } from '../schema/services-types'
import type { SpeedOperationSchema,SpeedProfileSchema } from '../schema/speed-types'

export type SpeedOperation = v.InferOutput<typeof SpeedOperationSchema>
export type SpeedProfile = v.InferOutput<typeof SpeedProfileSchema>
export type TranscriptionConfig = v.InferOutput<typeof ServicesConfigSchema>['transcription']
export type TTSConfig = v.InferOutput<typeof ServicesConfigSchema>['tts']
export type ImageConfig = v.InferOutput<typeof ServicesConfigSchema>['imageGen']

export type ImagePromptType =
  | 'keyMoment'
  | 'thumbnail'
  | 'conceptual'
  | 'infographic'
  | 'character'
  | 'quote'

export type MusicConfig = v.InferOutput<typeof ServicesConfigSchema>['music']
export type VideoConfig = v.InferOutput<typeof ServicesConfigSchema>['videoGen']

export type WizardStepId =
  | 'source'
  | 'source-config'
  | 'write-and-tts'
  | 'media'
  | 'review'
