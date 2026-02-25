import type { LLMConfig } from '~/types'

export const LLM_CONFIG: LLMConfig = {
  openai: {
    name: "OpenAI",
    models: [
      {
        id: "gpt-5.2",
        name: "gpt-5.2",
        description: "Latest GPT-5 series with expanded knowledge and improved performance",
        speed: "B",
        quality: "A",
        secsPerMin: 0.065,
        knowledge: "2025-08-31",
        releaseDate: "2025-12-11",
        lastUpdated: "2025-12-11",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 1.75,
          output: 14,
          cacheRead: 0.175
        },
        limit: {
          context: 400000,
          input: 272000,
          output: 128000
        }
      },
      {
        id: "gpt-5.2-pro",
        name: "gpt-5.2-pro",
        description: "Professional-tier GPT-5.2 for demanding applications",
        speed: "C",
        quality: "A",
        secsPerMin: 1.65,
        knowledge: "2025-08-31",
        releaseDate: "2025-12-11",
        lastUpdated: "2025-12-11",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 21,
          output: 168
        },
        limit: {
          context: 400000,
          input: 272000,
          output: 128000
        }
      },
      {
        id: "gpt-5.1",
        name: "gpt-5.1",
        description: "Updated GPT-5 with enhanced reasoning capabilities",
        speed: "B",
        quality: "A",
        secsPerMin: 0.085,
        knowledge: "2024-09-30",
        releaseDate: "2025-11-13",
        lastUpdated: "2025-11-13",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 1.25,
          output: 10,
          cacheRead: 0.13
        },
        limit: {
          context: 400000,
          input: 272000,
          output: 128000
        }
      }
    ]
  },
  claude: {
    name: "Claude",
    models: [
      {
        id: "claude-sonnet-4-5-20250929",
        name: "Claude Sonnet 4.5",
        description: "Smart model for complex agents and coding",
        speed: "A",
        quality: "A",
        knowledge: "2025-07-31",
        releaseDate: "2025-09-29",
        lastUpdated: "2025-09-29",
        modalities: {
          input: ["text", "image", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 3,
          output: 15,
          cacheRead: 0.3
        },
        limit: {
          context: 200000,
          output: 64000
        }
      },
      {
        id: "claude-opus-4-5-20251101",
        name: "Claude Opus 4.5",
        description: "Premium model with maximum intelligence",
        speed: "B",
        quality: "A",
        knowledge: "2025-03-31",
        releaseDate: "2025-11-01",
        lastUpdated: "2025-11-01",
        modalities: {
          input: ["text", "image", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 5,
          output: 25,
          cacheRead: 0.5
        },
        limit: {
          context: 200000,
          output: 64000
        }
      },
      {
        id: "claude-haiku-4-5-20251001",
        name: "Claude Haiku 4.5",
        description: "Fastest model with near-frontier intelligence",
        speed: "A",
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
        limit: {
          context: 200000,
          output: 64000
        }
      }
    ]
  },
  gemini: {
    name: "Google Gemini",
    models: [
      {
        id: "gemini-3-pro-preview",
        name: "Gemini 3 Pro",
        description: "Most intelligent model for complex reasoning tasks",
        speed: "B",
        quality: "A",
        knowledge: "2025-01",
        releaseDate: "2025-11-18",
        lastUpdated: "2025-11-18",
        modalities: {
          input: ["text", "image", "video", "audio", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 2,
          output: 12,
          cacheRead: 0.2
        },
        limit: {
          context: 1000000,
          output: 64000
        }
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        description: "Pro-level intelligence at Flash speed and pricing",
        speed: "A",
        quality: "A",
        knowledge: "2025-01",
        releaseDate: "2025-12-17",
        lastUpdated: "2025-12-17",
        modalities: {
          input: ["text", "image", "video", "audio", "pdf"],
          output: ["text"]
        },
        cost: {
          input: 0.5,
          output: 3,
          cacheRead: 0.05
        },
        limit: {
          context: 1048576,
          output: 65536
        }
      }
    ]
  },
  minimax: {
    name: "MiniMax",
    models: [
      {
        id: "MiniMax-M2.1",
        name: "MiniMax M2.1",
        description: "Multilingual programming model for complex workflows",
        speed: "B",
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
        limit: {
          context: 204800,
          output: 64000
        }
      },
      {
        id: "MiniMax-M2.1-lightning",
        name: "MiniMax M2.1 Lightning",
        description: "Faster MiniMax M2.1 variant for low-latency output",
        speed: "A",
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
        limit: {
          context: 204800,
          output: 64000
        }
      }
    ]
  },
  grok: {
    name: "Grok",
    models: [
      {
        id: "grok-4-1-fast-non-reasoning",
        name: "Grok 4.1 Fast",
        description: "Fast Grok 4.1 without reasoning tokens",
        speed: "A",
        quality: "A",
        releaseDate: "2025-01",
        lastUpdated: "2025-01",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        cost: {
          input: 0.2,
          output: 0.5,
          cacheRead: 0.05
        },
        limit: {
          context: 2000000,
          output: 128000
        }
      }
    ]
  },
  groq: {
    name: "Groq",
    models: [
      {
        id: "openai/gpt-oss-20b",
        name: "GPT OSS 20B",
        description: "Fast 20B model, 1000 T/s, 131k context",
        speed: "A",
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
        limit: {
          context: 131072,
          output: 65536
        }
      },
      {
        id: "openai/gpt-oss-120b",
        name: "GPT OSS 120B",
        description: "Large 120B model, 500 T/s, 131k context",
        speed: "B",
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
        limit: {
          context: 131072,
          output: 65536
        }
      },
    ]
  }
}

export const getLLMProviders = (): string[] => {
  return Object.keys(LLM_CONFIG)
}

export const getLLMModelsForService = (service: string) => {
  const provider = LLM_CONFIG[service as keyof typeof LLM_CONFIG]
  return provider?.models ?? []
}

export const getDefaultLLMService = (): string => 'openai'

export const getDefaultLLMModelForService = (service: string): string => {
  const models = getLLMModelsForService(service)
  return models[0]?.id ?? 'gpt-5.2'
}

export const getDefaultLLMModel = (): string => {
  return LLM_CONFIG.openai.models[0]!.id
}

export const getLLMModelIdsForService = (service: string): string[] => {
  return getLLMModelsForService(service).map(model => model.id)
}

export const isValidLLMModel = (service: string, model: string): boolean => {
  return getLLMModelIdsForService(service).includes(model)
}
