import type { VideoConfig, VideoGenServiceType } from '~/types'

export const VIDEO_CONFIG: VideoConfig = {
  openai: {
    name: "OpenAI Sora",
    models: [
      {
        id: "sora-2",
        name: "Sora 2",
        description: "Fast video generation for rapid iteration and social content",
        speed: "A",
        quality: "B",
        costPerSecond: 0.10
      },
      {
        id: "sora-2-pro",
        name: "Sora 2 Pro",
        description: "Production-quality cinematic video for marketing assets",
        speed: "B",
        quality: "A",
        costPerSecond: 0.10
      }
    ],
    sizes: [
      { id: "1920x1080", name: "1080p Landscape", description: "Full HD widescreen (16:9)" },
      { id: "1080x1920", name: "1080p Portrait", description: "Full HD vertical for TikTok/Reels/Shorts" },
      { id: "1280x720", name: "720p Landscape", description: "HD widescreen (16:9)" },
      { id: "720x1280", name: "720p Portrait", description: "HD vertical" }
    ],
    durations: [4, 8, 12]
  },
  gemini: {
    name: "Gemini Veo",
    models: [
      {
        id: "veo-3.1-generate-preview",
        name: "Veo 3.1",
        description: "Quality-focused video generation with native audio",
        speed: "B",
        quality: "A",
        costPerSecond: 0.40
      },
      {
        id: "veo-3.1-fast-generate-preview",
        name: "Veo 3.1 Fast",
        description: "Speed-focused video generation for rapid iteration",
        speed: "A",
        quality: "B",
        costPerSecond: 0.35
      }
    ],
    sizes: [
      { id: "720p", name: "720p HD", description: "HD resolution (all durations)" },
      { id: "1080p", name: "1080p Full HD", description: "Full HD (8s duration only)" },
      { id: "4k", name: "4K Ultra HD", description: "Ultra HD (8s duration only)" }
    ],
    durations: [4, 6, 8],
    aspectRatios: ["16:9", "9:16"]
  },
  minimax: {
    name: "MiniMax Hailuo",
    models: [
      {
        id: "MiniMax-Hailuo-2.3",
        name: "Hailuo 2.3",
        description: "Latest flagship model with 768P/1080P support and camera controls",
        speed: "B",
        quality: "A",
        costPerSecond: 0
      },
      {
        id: "MiniMax-Hailuo-02",
        name: "Hailuo 02",
        description: "High-quality video with 768P/1080P and extended duration",
        speed: "B",
        quality: "A",
        costPerSecond: 0
      },
      {
        id: "T2V-01-Director",
        name: "T2V Director",
        description: "Director-style video with camera angle controls",
        speed: "B",
        quality: "B",
        costPerSecond: 0
      },
      {
        id: "T2V-01",
        name: "T2V 01",
        description: "Standard text-to-video generation",
        speed: "A",
        quality: "B",
        costPerSecond: 0
      }
    ],
    sizes: [
      { id: "768P", name: "768P HD", description: "HD resolution (6s or 10s)" },
      { id: "1080P", name: "1080P Full HD", description: "Full HD (6s only, Hailuo models)" },
      { id: "720P", name: "720P HD", description: "HD resolution (T2V models, 6s only)" }
    ],
    durations: [6, 10]
  },
  grok: {
    name: "Grok Video",
    models: [
      {
        id: "grok-imagine-video",
        name: "Grok Imagine Video",
        description: "High-quality video generation with multiple aspect ratios",
        speed: "B",
        quality: "A",
        costPerSecond: 0
      }
    ],
    sizes: [
      { id: "720p", name: "720p HD", description: "HD resolution (1280x720)" },
      { id: "480p", name: "480p SD", description: "Standard definition (854x480)" }
    ],
    durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "4:3", "1:1", "9:16", "3:4", "3:2", "2:3"]
  }
}

export const getDefaultVideoService = (): VideoGenServiceType => {
  return 'openai'
}

export const getDefaultVideoModel = (service: VideoGenServiceType = 'openai'): string => {
  if (service === 'minimax') return 'MiniMax-Hailuo-2.3'
  if (service === 'grok') return 'grok-imagine-video'
  const config = VIDEO_CONFIG[service]
  if (!config) return VIDEO_CONFIG.openai.models[0]!.id
  return config.models[0]!.id
}

export const getDefaultVideoSize = (service: VideoGenServiceType = 'openai'): string => {
  if (service === 'gemini') return '720p'
  if (service === 'minimax') return '768P'
  if (service === 'grok') return '720p'
  return '1280x720'
}

export const getDefaultVideoDuration = (): number => {
  return 8
}

export const getDefaultVideoAspectRatio = (): string => {
  return '16:9'
}

export const getVideoPromptTypes = (): string[] => {
  return ['explainer', 'highlight', 'intro', 'outro', 'social']
}

export const getVideoModelsForService = (service: VideoGenServiceType): string[] => {
  const config = VIDEO_CONFIG[service]
  return config ? config.models.map(model => model.id) : []
}

export const isValidVideoModel = (service: VideoGenServiceType, model: string): boolean => {
  return getVideoModelsForService(service).includes(model)
}
