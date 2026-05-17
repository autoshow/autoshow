import * as v from 'valibot'
import { ModelEstimationSchema } from './estimation-types'
import { SpeedProfileSchema } from './speed-types'
import { Step2DocumentMetadataSchema } from './step-2-document-types'

export const TranscriptionServiceTypeSchema = v.union([
  v.literal('groq'),
  v.literal('deepinfra'),
  v.literal('happyscribe'),
  v.literal('gladia'),
  v.literal('assembly'),
  v.literal('deepgram'),
  v.literal('soniox'),
  v.literal('deapi'),
  v.literal('supadata'),
  v.literal('youtube')
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
  transcriptionService: TranscriptionServiceTypeSchema,
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  tokenCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalCost: v.optional(v.pipe(v.number(), v.minValue(0))),
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0))),
  transcriptionLanguage: v.optional(v.string(), undefined),
  transcriptionLanguageName: v.optional(v.string(), undefined),
  captionSource: v.optional(v.union([v.literal('manual'), v.literal('automatic')]), undefined)
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

const HappyScribeLinkSchema = v.object({
  href: v.optional(v.string())
})

export const HappyScribeTranscriptionResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  state: v.string(),
  name: v.optional(v.string()),
  failureMessage: v.optional(v.string()),
  costInCents: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
  audioLengthInSeconds: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
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

export const GladiaUtteranceSchema = v.object({
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

export const Step2CombinedMetadataSchema = v.union([Step2MetadataSchema, Step2DocumentMetadataSchema])

export const transcriptionServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    estimation: ModelEstimationSchema,
    speedProfile: SpeedProfileSchema,
    quality: v.string(),
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

const VerboseTranscriptionSegmentSchema = v.object({
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

export const VerboseTranscriptionSchema = v.object({
  task: v.optional(v.string()),
  language: v.optional(v.string()),
  duration: v.optional(v.pipe(v.number(), v.minValue(0))),
  text: v.string(),
  segments: v.optional(v.array(VerboseTranscriptionSegmentSchema))
})

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

const AssemblyUtteranceSchema = v.object({
  text: v.string(),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  speaker: v.optional(v.union([v.string(), v.number()])),
  words: v.optional(v.array(AssemblyTranscriptWordSchema))
})

const AssemblyTranscriptStatusSchema = v.picklist(['queued', 'processing', 'completed', 'error'])

export const AssemblyTranscriptResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: AssemblyTranscriptStatusSchema,
  text: v.optional(v.nullable(v.string())),
  utterances: v.optional(v.nullable(v.array(AssemblyUtteranceSchema))),
  words: v.optional(v.nullable(v.array(AssemblyTranscriptWordSchema))),
  error: v.optional(v.nullable(v.string())),
  audio_duration: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0))))
})

export const DeepgramWordSchema = v.object({
  word: v.optional(v.string()),
  punctuated_word: v.optional(v.string()),
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  confidence: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),
  speaker: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

const DeepgramUtteranceSchema = v.object({
  start: v.pipe(v.number(), v.minValue(0)),
  end: v.pipe(v.number(), v.minValue(0)),
  speaker: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  transcript: v.optional(v.string()),
  words: v.optional(v.array(DeepgramWordSchema))
})

const DeepgramAlternativeSchema = v.object({
  transcript: v.optional(v.string()),
  words: v.optional(v.array(DeepgramWordSchema))
})

const DeepgramChannelSchema = v.object({
  alternatives: v.array(DeepgramAlternativeSchema)
})

const DeepgramResultsSchema = v.object({
  channels: v.array(DeepgramChannelSchema),
  utterances: v.optional(v.array(DeepgramUtteranceSchema))
})

const DeepgramMetadataSchema = v.object({
  duration: v.optional(v.pipe(v.number(), v.minValue(0))),
  channels: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  model_info: v.optional(v.unknown()),
  request_id: v.optional(v.string()),
  sha256: v.optional(v.string()),
  created: v.optional(v.string())
})

export const DeepgramResponseSchema = v.object({
  metadata: v.optional(DeepgramMetadataSchema),
  results: DeepgramResultsSchema
})

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

export const DeapiCreateResponseSchema = v.object({
  data: v.object({
    request_id: v.pipe(v.string(), v.nonEmpty())
  })
})

const DeapiSegmentSchema = v.object({
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
