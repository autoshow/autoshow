import * as v from 'valibot'
import type { ServicesConfig } from './services-types'
import { Step2DocumentMetadataSchema } from './step-2-document-types'

export const TranscriptionServiceTypeSchema = v.union([
  v.literal('groq'),
  v.literal('deepinfra'),
  v.literal('happyscribe'),
  v.literal('fal'),
  v.literal('gladia'),
  v.literal('elevenlabs'),
  v.literal('rev'),
  v.literal('assembly'),
  v.literal('deepgram'),
  v.literal('soniox')
])

export const TranscriptionSegmentSchema = v.object({
  start: v.string(),
  end: v.string(),
  text: v.string(),
  speaker: v.optional(v.string(), undefined)
})

export const TranscriptionResultSchema = v.object({
  text: v.string(),
  segments: v.array(TranscriptionSegmentSchema)
})

export const Step2MetadataSchema = v.object({
  transcriptionService: v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('fal'), v.literal('gladia'), v.literal('elevenlabs'), v.literal('rev'), v.literal('assembly'), v.literal('deepgram'), v.literal('soniox')]),
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  tokenCount: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const HappyScribeWordSchema = v.object({
  text: v.string(),
  type: v.string(),
  data_start: v.pipe(v.number(), v.minValue(0)),
  data_end: v.pipe(v.number(), v.minValue(0)),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
})

export const HappyScribeSegmentSchema = v.object({
  speaker: v.string(),
  speaker_number: v.pipe(v.number(), v.integer(), v.minValue(0)),
  words: v.array(HappyScribeWordSchema)
})

export const HappyScribeJsonOutputSchema = v.array(HappyScribeSegmentSchema)

export const HappyScribeLinkSchema = v.object({
  href: v.optional(v.string())
})

export const HappyScribeTranscriptionResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  state: v.string(),
  name: v.optional(v.string()),
  failureMessage: v.optional(v.string()),
  _links: v.optional(v.object({
    self: v.optional(HappyScribeLinkSchema)
  }))
})

export const HappyScribeExportResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  state: v.string(),
  download_link: v.optional(v.string()),
  _links: v.optional(v.object({
    self: v.optional(HappyScribeLinkSchema)
  }))
})

export const GladiaUploadResponseSchema = v.object({
  audio_url: v.pipe(v.string(), v.nonEmpty()),
  audio_metadata: v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    filename: v.string(),
    extension: v.string(),
    size: v.pipe(v.number(), v.integer(), v.minValue(0)),
    audio_duration: v.pipe(v.number(), v.minValue(0)),
    number_of_channels: v.pipe(v.number(), v.integer(), v.minValue(1)),
    source: v.optional(v.string())
  })
})

export const GladiaTranscriptionInitResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  result_url: v.pipe(v.string(), v.nonEmpty())
})

const GladiaUtteranceSchema = v.object({
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  channel: v.pipe(v.number(), v.integer(), v.minValue(0)),
  words: v.array(v.object({
    word: v.string(),
    start: v.pipe(v.number(), v.minValue(0)),
    end: v.pipe(v.number(), v.minValue(0)),
    confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
  })),
  text: v.string(),
  language: v.string(),
  speaker: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

export const GladiaTranscriptionStatusResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  request_id: v.string(),
  version: v.pipe(v.number(), v.integer()),
  status: v.union([v.literal('queued'), v.literal('processing'), v.literal('done'), v.literal('error')]),
  created_at: v.string(),
  kind: v.literal('pre-recorded'),
  completed_at: v.optional(v.nullable(v.string())),
  error_code: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
  file: v.optional(v.nullable(v.object({
    id: v.string(),
    filename: v.string(),
    source: v.nullable(v.string()),
    audio_duration: v.pipe(v.number(), v.minValue(0)),
    number_of_channels: v.pipe(v.number(), v.integer(), v.minValue(1))
  }))),
  result: v.optional(v.nullable(v.object({
    metadata: v.object({
      audio_duration: v.pipe(v.number(), v.minValue(0)),
      number_of_distinct_channels: v.pipe(v.number(), v.integer(), v.minValue(1)),
      billing_time: v.pipe(v.number(), v.minValue(0)),
      transcription_time: v.pipe(v.number(), v.minValue(0))
    }),
    transcription: v.object({
      full_transcript: v.string(),
      languages: v.array(v.string()),
      utterances: v.array(GladiaUtteranceSchema)
    })
  })))
})

export const TranscriptionServiceSchema = v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('fal'), v.literal('gladia'), v.literal('elevenlabs'), v.literal('rev'), v.literal('assembly'), v.literal('deepgram'), v.literal('soniox')])

export const Step2CombinedMetadataSchema = v.union([Step2MetadataSchema, Step2DocumentMetadataSchema])

export const transcriptionServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    speed: v.string(),
    quality: v.string(),
    secsPerMin: v.optional(v.pipe(v.number(), v.minValue(0))),
    centicentsPerMin: v.optional(v.pipe(v.number(), v.minValue(0))),
    knowledge: v.optional(v.string()),
    releaseDate: v.optional(v.string()),
    lastUpdated: v.optional(v.string()),
    modalities: v.optional(v.object({
      input: v.array(v.string()),
      output: v.array(v.string())
    })),
    cost: v.optional(v.object({
      input: v.number(),
      output: v.number(),
      cacheRead: v.optional(v.number())
    })),
    limit: v.optional(v.object({
      context: v.number(),
      input: v.optional(v.number()),
      output: v.number()
    }))
  })), v.minLength(1))
})

export type TranscriptionServiceType = v.InferOutput<typeof TranscriptionServiceTypeSchema>
export type TranscriptionSegment = v.InferOutput<typeof TranscriptionSegmentSchema>
export type TranscriptionResult = v.InferOutput<typeof TranscriptionResultSchema>
export type Step2Metadata = v.InferOutput<typeof Step2MetadataSchema>
export type HappyScribeWord = v.InferOutput<typeof HappyScribeWordSchema>
export type HappyScribeSegment = v.InferOutput<typeof HappyScribeSegmentSchema>
export type HappyScribeJsonOutput = v.InferOutput<typeof HappyScribeJsonOutputSchema>
export type HappyScribeTranscriptionResponse = v.InferOutput<typeof HappyScribeTranscriptionResponseSchema>
export type HappyScribeExportResponse = v.InferOutput<typeof HappyScribeExportResponseSchema>
export type GladiaUploadResponse = v.InferOutput<typeof GladiaUploadResponseSchema>
export type GladiaTranscriptionInitResponse = v.InferOutput<typeof GladiaTranscriptionInitResponseSchema>
export type GladiaUtterance = v.InferOutput<typeof GladiaUtteranceSchema>
export type GladiaTranscriptionStatusResponse = v.InferOutput<typeof GladiaTranscriptionStatusResponseSchema>
export type Step2CombinedMetadata = v.InferOutput<typeof Step2CombinedMetadataSchema>

export const FalJobStatusSchema = v.picklist(['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED', 'FAILED'])

export const FalWhisperChunkSchema = v.object({
  timestamp: v.tuple([v.number(), v.nullable(v.number())]),
  text: v.string(),
  speaker: v.optional(v.nullable(v.string()))
})

export const FalDiarizationSegmentSchema = v.object({
  timestamp: v.tuple([v.number(), v.nullable(v.number())]),
  speaker: v.nullable(v.string())
})

export const FalWhisperOutputSchema = v.object({
  text: v.string(),
  chunks: v.optional(v.array(FalWhisperChunkSchema)),
  inferred_languages: v.array(v.string()),
  diarization_segments: v.optional(v.array(FalDiarizationSegmentSchema))
})

export const FalQueueResponseSchema = v.object({
  request_id: v.string(),
  status: FalJobStatusSchema,
  response_url: v.optional(v.string())
})

export const FalStatusResponseSchema = v.object({
  status: FalJobStatusSchema,
  logs: v.optional(v.nullable(v.array(v.object({ message: v.string() })))),
  error: v.optional(v.string())
})

export const FalStorageInitiateResponseSchema = v.object({
  file_url: v.string(),
  upload_url: v.string()
})

export type FalJobStatus = v.InferOutput<typeof FalJobStatusSchema>
export type FalWhisperChunk = v.InferOutput<typeof FalWhisperChunkSchema>
export type FalDiarizationSegment = v.InferOutput<typeof FalDiarizationSegmentSchema>
export type FalWhisperOutput = v.InferOutput<typeof FalWhisperOutputSchema>
export type FalQueueResponse = v.InferOutput<typeof FalQueueResponseSchema>
export type FalStatusResponse = v.InferOutput<typeof FalStatusResponseSchema>
export type FalStorageInitiateResponse = v.InferOutput<typeof FalStorageInitiateResponseSchema>

export type GladiaTranscriptionOptions = {
  audioUrl: string
  enableDiarization?: boolean
  detectLanguage?: boolean
  language?: string
}

export const ElevenLabsScribeWordSchema = v.object({
  text: v.string(),
  type: v.union([v.literal('word'), v.literal('spacing'), v.literal('audio_event')]),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  speaker_id: v.optional(v.nullable(v.string()))
})

export const ElevenLabsScribeResponseSchema = v.object({
  language_code: v.string(),
  language_probability: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  text: v.string(),
  words: v.array(ElevenLabsScribeWordSchema)
})

export type ElevenLabsScribeWord = v.InferOutput<typeof ElevenLabsScribeWordSchema>
export type ElevenLabsScribeResponse = v.InferOutput<typeof ElevenLabsScribeResponseSchema>

export const OpenAITranscriptionSegmentSchema = v.object({
  id: v.pipe(v.number(), v.integer(), v.minValue(0)),
  seek: v.pipe(v.number(), v.minValue(0)),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  text: v.string(),
  tokens: v.array(v.number()),
  temperature: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  avg_logprob: v.number(),
  compression_ratio: v.number(),
  no_speech_prob: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
})

export const OpenAIVerboseTranscriptionSchema = v.object({
  task: v.optional(v.string()),
  language: v.optional(v.string()),
  duration: v.optional(v.pipe(v.number(), v.minValue(0))),
  text: v.string(),
  segments: v.optional(v.array(OpenAITranscriptionSegmentSchema))
})

export type OpenAITranscriptionSegment = v.InferOutput<typeof OpenAITranscriptionSegmentSchema>
export type OpenAIVerboseTranscription = v.InferOutput<typeof OpenAIVerboseTranscriptionSchema>

export const LemonfoxTranscriptionSegmentSchema = v.object({
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  text: v.string(),
  speaker: v.optional(v.nullable(v.string()))
})

export const LemonfoxTranscriptionResponseSchema = v.object({
  text: v.string(),
  segments: v.optional(v.array(LemonfoxTranscriptionSegmentSchema))
})

export type LemonfoxTranscriptionSegment = v.InferOutput<typeof LemonfoxTranscriptionSegmentSchema>
export type LemonfoxTranscriptionResponse = v.InferOutput<typeof LemonfoxTranscriptionResponseSchema>

export const RevElementSchema = v.object({
  type: v.string(),
  value: v.string(),
  ts: v.optional(v.pipe(v.number(), v.minValue(0))),
  end_ts: v.optional(v.pipe(v.number(), v.minValue(0))),
  confidence: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)))
})

export const RevMonologueSchema = v.object({
  speaker: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  elements: v.array(RevElementSchema)
})

export const RevTranscriptResponseSchema = v.object({
  monologues: v.array(RevMonologueSchema)
})

export const RevJobResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: v.string(),
  created_on: v.optional(v.string()),
  completed_on: v.optional(v.string()),
  failure_detail: v.optional(v.string()),
  type: v.optional(v.string()),
  duration_seconds: v.optional(v.pipe(v.number(), v.minValue(0)))
})

export type RevElement = v.InferOutput<typeof RevElementSchema>
export type RevMonologue = v.InferOutput<typeof RevMonologueSchema>
export type RevTranscriptResponse = v.InferOutput<typeof RevTranscriptResponseSchema>
export type RevJobResponse = v.InferOutput<typeof RevJobResponseSchema>

export const AssemblyUploadResponseSchema = v.object({
  upload_url: v.pipe(v.string(), v.nonEmpty())
})

export const AssemblyTranscriptWordSchema = v.object({
  text: v.string(),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  confidence: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),
  speaker: v.optional(v.union([v.string(), v.number()]))
})

export const AssemblyUtteranceSchema = v.object({
  text: v.string(),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  speaker: v.optional(v.union([v.string(), v.number()])),
  words: v.optional(v.array(AssemblyTranscriptWordSchema))
})

export const AssemblyTranscriptStatusSchema = v.picklist(['queued', 'processing', 'completed', 'error'])

export const AssemblyTranscriptResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: AssemblyTranscriptStatusSchema,
  text: v.optional(v.nullable(v.string())),
  utterances: v.optional(v.nullable(v.array(AssemblyUtteranceSchema))),
  words: v.optional(v.nullable(v.array(AssemblyTranscriptWordSchema))),
  error: v.optional(v.nullable(v.string()))
})

export type AssemblyUploadResponse = v.InferOutput<typeof AssemblyUploadResponseSchema>
export type AssemblyTranscriptWord = v.InferOutput<typeof AssemblyTranscriptWordSchema>
export type AssemblyUtterance = v.InferOutput<typeof AssemblyUtteranceSchema>
export type AssemblyTranscriptStatus = v.InferOutput<typeof AssemblyTranscriptStatusSchema>
export type AssemblyTranscriptResponse = v.InferOutput<typeof AssemblyTranscriptResponseSchema>

export const DeepgramWordSchema = v.object({
  word: v.optional(v.string()),
  punctuated_word: v.optional(v.string()),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  confidence: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),
  speaker: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

export const DeepgramUtteranceSchema = v.object({
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  speaker: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  transcript: v.optional(v.string()),
  words: v.optional(v.array(DeepgramWordSchema))
})

export const DeepgramAlternativeSchema = v.object({
  transcript: v.optional(v.string()),
  words: v.optional(v.array(DeepgramWordSchema))
})

export const DeepgramChannelSchema = v.object({
  alternatives: v.array(DeepgramAlternativeSchema)
})

export const DeepgramResultsSchema = v.object({
  channels: v.array(DeepgramChannelSchema),
  utterances: v.optional(v.array(DeepgramUtteranceSchema))
})

export const DeepgramResponseSchema = v.object({
  metadata: v.optional(v.unknown()),
  results: DeepgramResultsSchema
})

export type DeepgramWord = v.InferOutput<typeof DeepgramWordSchema>
export type DeepgramUtterance = v.InferOutput<typeof DeepgramUtteranceSchema>
export type DeepgramAlternative = v.InferOutput<typeof DeepgramAlternativeSchema>
export type DeepgramChannel = v.InferOutput<typeof DeepgramChannelSchema>
export type DeepgramResults = v.InferOutput<typeof DeepgramResultsSchema>
export type DeepgramResponse = v.InferOutput<typeof DeepgramResponseSchema>

export const SonioxTokenSchema = v.object({
  text: v.string(),
  start_ms: v.optional(v.pipe(v.number(), v.minValue(0))),
  end_ms: v.optional(v.pipe(v.number(), v.minValue(0))),
  confidence: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),
  speaker: v.optional(v.union([v.string(), v.pipe(v.number(), v.integer(), v.minValue(0))]))
})

export const SonioxTranscriptResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  text: v.optional(v.string()),
  tokens: v.optional(v.array(SonioxTokenSchema))
})

export const SonioxFileUploadResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty())
})

export const SonioxTranscriptionInitResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: v.optional(v.string())
})

export const SonioxTranscriptionStatusResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: v.string(),
  error_message: v.optional(v.nullable(v.string())),
  error_type: v.optional(v.nullable(v.string())),
  audio_duration_ms: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0))))
})

export type SonioxToken = v.InferOutput<typeof SonioxTokenSchema>
export type SonioxTranscriptResponse = v.InferOutput<typeof SonioxTranscriptResponseSchema>
export type SonioxFileUploadResponse = v.InferOutput<typeof SonioxFileUploadResponseSchema>
export type SonioxTranscriptionInitResponse = v.InferOutput<typeof SonioxTranscriptionInitResponseSchema>
export type SonioxTranscriptionStatusResponse = v.InferOutput<typeof SonioxTranscriptionStatusResponseSchema>

export const DeapiCreateResponseSchema = v.object({
  data: v.object({
    request_id: v.pipe(v.string(), v.nonEmpty())
  })
})

export const DeapiSegmentSchema = v.object({
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  text: v.string()
})

export const DeapiResultSchema = v.object({
  text: v.string(),
  segments: v.optional(v.array(DeapiSegmentSchema))
})

export const DeapiStatusResponseSchema = v.object({
  data: v.object({
    status: v.union([v.literal('pending'), v.literal('processing'), v.literal('done'), v.literal('error')]),
    progress: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100)))),
    result_url: v.optional(v.nullable(v.string())),
    result: v.optional(v.nullable(DeapiResultSchema)),
    error: v.optional(v.nullable(v.string()))
  })
})

export type DeapiCreateResponse = v.InferOutput<typeof DeapiCreateResponseSchema>
export type DeapiSegment = v.InferOutput<typeof DeapiSegmentSchema>
export type DeapiResult = v.InferOutput<typeof DeapiResultSchema>
export type DeapiStatusResponse = v.InferOutput<typeof DeapiStatusResponseSchema>

export const SupadataChunkSchema = v.object({
  text: v.string(),
  offset: v.pipe(v.number(), v.minValue(0)),
  duration: v.pipe(v.number(), v.minValue(0)),
  lang: v.optional(v.string())
})

export const SupadataTranscriptResponseSchema = v.object({
  content: v.array(SupadataChunkSchema),
  lang: v.optional(v.string()),
  availableLangs: v.optional(v.array(v.string()))
})

export const SupadataJobResponseSchema = v.object({
  jobId: v.pipe(v.string(), v.nonEmpty())
})

export const SupadataJobStatusResponseSchema = v.object({
  status: v.union([v.literal('pending'), v.literal('processing'), v.literal('completed'), v.literal('failed')]),
  content: v.optional(v.array(SupadataChunkSchema)),
  lang: v.optional(v.string()),
  error: v.optional(v.string())
})

export type SupadataChunk = v.InferOutput<typeof SupadataChunkSchema>
export type SupadataTranscriptResponse = v.InferOutput<typeof SupadataTranscriptResponseSchema>
export type SupadataJobResponse = v.InferOutput<typeof SupadataJobResponseSchema>
export type SupadataJobStatusResponse = v.InferOutput<typeof SupadataJobStatusResponseSchema>

export type TranscriptionConfig = ServicesConfig['transcription']
