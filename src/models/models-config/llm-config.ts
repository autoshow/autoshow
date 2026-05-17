import { attachModelEstimations,buildLLMModelEstimation } from '~/models/models-utils/estimate-speed'
import { createLLMSpeedProfile } from '~/models/models-utils/speed'
import type { LLMConfig } from '~/types'

const FAST_LLM_ESTIMATION = {
  outputTokensPerPrompt: 120,
  documentInputTokensPerPage: 700,
  documentImageInputTokens: 700,
  documentDefaultTextInputTokens: 900,
  documentDefaultDocxInputTokens: 1_200,
} as const

const BALANCED_LLM_ESTIMATION = {
  ...FAST_LLM_ESTIMATION,
  outputTokensPerPrompt: 180,
} as const

const REASONING_LLM_ESTIMATION = {
  ...FAST_LLM_ESTIMATION,
  outputTokensPerPrompt: 240,
} as const

export const LLM_CONFIG: LLMConfig = {
  openai: {
    name: "OpenAI",
    models: attachModelEstimations([
      {
        id: "gpt-5.4-pro",
        name: "gpt-5.4-pro",
        description: "Tough problems that may take longer to solve and need deeper reasoning",
        speedProfile: createLLMSpeedProfile("C", {
          llm: { baseMs: 12_000 }
        }),
        quality: "A",
        knowledge: "2025-12-31",
        releaseDate: "2026-03-17",
        lastUpdated: "2026-03-17",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 30,
          output: 180
        },
        estimationHeuristics: REASONING_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          input: 272000,
          output: 128000
        }
      },
      {
        id: "gpt-5.4",
        name: "gpt-5.4",
        description: "General-purpose work, including complex reasoning, broad world knowledge, and code-heavy or multi-step agentic tasks",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 2_000 }
        }),
        quality: "A",
        knowledge: "2025-12-31",
        releaseDate: "2026-03-17",
        lastUpdated: "2026-03-17",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 2.5,
          output: 15,
          cacheRead: 0.25
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          input: 272000,
          output: 128000
        }
      },
      {
        id: "gpt-5.4-mini",
        name: "gpt-5.4-mini",
        description: "High-volume coding, computer use, and agent workflows that still need strong reasoning",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 1_000 }
        }),
        quality: "A",
        knowledge: "2025-12-31",
        releaseDate: "2026-03-17",
        lastUpdated: "2026-03-17",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 0.75,
          output: 4.5,
          cacheRead: 0.075
        },
        estimationHeuristics: FAST_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          input: 272000,
          output: 128000
        }
      },
      {
        id: "gpt-5.4-nano",
        name: "gpt-5.4-nano",
        description: "Simple high-throughput tasks where speed and cost matter most",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 400 }
        }),
        quality: "B",
        knowledge: "2025-12-31",
        releaseDate: "2026-03-17",
        lastUpdated: "2026-03-17",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 0.2,
          output: 1.25,
          cacheRead: 0.02
        },
        estimationHeuristics: FAST_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          input: 272000,
          output: 128000
        }
      }
    ], buildLLMModelEstimation)
  },
  claude: {
    name: "Claude",
    models: attachModelEstimations([
      {
        id: "claude-opus-4-6",
        name: "Claude Opus 4.6",
        description: "Most intelligent model for building agents and coding",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 6_500 }
        }),
        quality: "A",
        knowledge: "2025-05-31",
        releaseDate: "2026-03-28",
        lastUpdated: "2026-03-28",
        modalities: {
          input: ["text", "image", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 5,
          output: 25,
          cacheRead: 0.5
        },
        estimationHeuristics: REASONING_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          output: 128000
        }
      },
      {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        description: "Best combination of speed and intelligence",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 2_200 }
        }),
        quality: "A",
        knowledge: "2025-08-31",
        releaseDate: "2026-03-28",
        lastUpdated: "2026-03-28",
        modalities: {
          input: ["text", "image", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 3,
          output: 15,
          cacheRead: 0.3
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          output: 64000
        }
      },
      {
        id: "claude-haiku-4-5-20251001",
        name: "Claude Haiku 4.5",
        description: "Fastest model with near-frontier intelligence",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 300 },
          document: {
            baseMs: 6_500,
            perPageMs: 1_600
          }
        }),
        quality: "B",
        knowledge: "2025-02-28",
        releaseDate: "2025-10-15",
        lastUpdated: "2025-10-15",
        modalities: {
          input: ["text", "image", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 1,
          output: 5,
          cacheRead: 0.1
        },
        estimationHeuristics: FAST_LLM_ESTIMATION,
        limit: {
          context: 200000,
          output: 64000
        }
      }
    ], buildLLMModelEstimation)
  },
  gemini: {
    name: "Google Gemini",
    models: attachModelEstimations([
      {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        description: "Most intelligent model for complex reasoning tasks",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 8_500 },
          document: {
            baseMs: 28_000,
            perPageMs: 3_400
          }
        }),
        quality: "A",
        knowledge: "2025-01",
        releaseDate: "2026-03-01",
        lastUpdated: "2026-03-01",
        modalities: {
          input: ["text", "image", "video", "audio", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 2,
          output: 12,
          cacheRead: 0.2
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          output: 64000
        }
      },
      {
        id: "gemini-3.1-flash-lite-preview",
        name: "Gemini 3.1 Flash-Lite",
        description: "Most cost-efficient model for high-volume agentic tasks",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 4_300 },
          document: {
            baseMs: 36_000,
            perPageMs: 4_000
          }
        }),
        quality: "A",
        knowledge: "2025-01",
        releaseDate: "2026-03-01",
        lastUpdated: "2026-03-01",
        modalities: {
          input: ["text", "image", "video", "audio", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 0.25,
          output: 1.5,
          cacheRead: 0.025
        },
        estimationHeuristics: FAST_LLM_ESTIMATION,
        limit: {
          context: 1000000,
          output: 64000
        }
      }
    ], buildLLMModelEstimation)
  },
  minimax: {
    name: "MiniMax",
    models: attachModelEstimations([
      {
        id: "MiniMax-M2.1",
        name: "MiniMax M2.1",
        description: "Multilingual programming model for complex workflows",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 12_500 }
        }),
        quality: "A",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        cost: {
          input: 0.3,
          output: 1.2,
          cacheRead: 0.03
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 204800,
          output: 64000
        }
      },
      {
        id: "MiniMax-M2.1-lightning",
        name: "MiniMax M2.1 Lightning",
        description: "Faster MiniMax M2.1 variant for low-latency output",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 13_500 }
        }),
        quality: "A",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        cost: {
          input: 0.3,
          output: 2.4,
          cacheRead: 0.03
        },
        estimationHeuristics: FAST_LLM_ESTIMATION,
        limit: {
          context: 204800,
          output: 64000
        }
      }
    ], buildLLMModelEstimation)
  },
  deepinfra: {
    name: "DeepInfra",
    models: attachModelEstimations([
      {
        id: "MiniMaxAI/MiniMax-M2.5",
        name: "MiniMax M2.5",
        description: "DeepInfra-hosted MiniMax M2.5 exposed through an OpenAI-compatible API",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 31_400 }
        }),
        quality: "A",
        releaseDate: "2025-01",
        lastUpdated: "2025-01",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        cost: {
          input: 0.27,
          output: 0.95,
          cacheRead: 0.03
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 192000,
          output: 64000
        }
      }
    ], buildLLMModelEstimation)
  },
  grok: {
    name: "Grok",
    models: attachModelEstimations([
      {
        id: "grok-4.20-0309-non-reasoning",
        name: "Grok 4.2",
        description: "Grok 4.2 without reasoning tokens",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 200 }
        }),
        quality: "A",
        releaseDate: "2026-03",
        lastUpdated: "2026-03",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 2.0,
          output: 6.0,
          cacheRead: 0.2
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 2000000,
          output: 128000
        }
      }
    ], buildLLMModelEstimation)
  },
  groq: {
    name: "Groq",
    models: attachModelEstimations([
      {
        id: "openai/gpt-oss-20b",
        name: "GPT OSS 20B",
        description: "Fast 20B model, 1000 T/s, 131k context",
        speedProfile: createLLMSpeedProfile("A", {
          llm: { baseMs: 700 }
        }),
        quality: "B",
        releaseDate: "2025-08-05",
        lastUpdated: "2025-08-05",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        cost: {
          input: 0.075,
          output: 0.3
        },
        estimationHeuristics: FAST_LLM_ESTIMATION,
        limit: {
          context: 131072,
          output: 65536
        }
      },
      {
        id: "openai/gpt-oss-120b",
        name: "GPT OSS 120B",
        description: "Large 120B model, 500 T/s, 131k context",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 600 }
        }),
        quality: "A",
        releaseDate: "2025-08-05",
        lastUpdated: "2025-08-05",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        cost: {
          input: 0.15,
          output: 0.6
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 131072,
          output: 65536
        }
      },
    ]
    , buildLLMModelEstimation)
  },
  glm: {
    name: "GLM",
    models: attachModelEstimations([
      {
        id: "glm-5",
        name: "GLM-5",
        description: "Flagship foundation model with strong coding and agentic capabilities",
        speedProfile: createLLMSpeedProfile("B", {
          llm: { baseMs: 9_300 }
        }),
        quality: "A",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        cost: {
          input: 1,
          output: 3.2
        },
        estimationHeuristics: BALANCED_LLM_ESTIMATION,
        limit: {
          context: 200000,
          output: 128000
        }
      }
    ], buildLLMModelEstimation)
  }
}

const getLLMModelsForService = (service: string) => {
  const provider = LLM_CONFIG[service as keyof typeof LLM_CONFIG]
  return provider?.models ?? []
}

export const getDefaultLLMService = (): string => 'openai'

export const getDefaultLLMModelForService = (service: string): string => {
  const models = getLLMModelsForService(service)
  return models[0]?.id ?? 'gpt-5.4-pro'
}

export const getLLMModelIdsForService = (service: string): string[] => {
  return getLLMModelsForService(service).map(model => model.id)
}

export const isValidLLMModel = (service: string, model: string): boolean => {
  return getLLMModelIdsForService(service).includes(model)
}
