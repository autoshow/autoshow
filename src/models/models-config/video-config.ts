import { attachModelEstimations,buildVideoModelEstimation } from '~/models/models-utils/estimate-speed'
import { createVideoSpeedProfile } from '~/models/models-utils/speed'
import type { VideoConfig,VideoGenServiceType } from '~/types'

export const VIDEO_CONFIG: VideoConfig = {
  gemini: {
    name: "Gemini Veo",
    models: attachModelEstimations([
      {
        id: "veo-3.1-generate-preview",
        name: "Veo 3.1",
        description: "Quality-focused video generation with native audio",
        speedProfile: createVideoSpeedProfile(10_000),
        quality: "A",
        costPerSecond: 0.40
      },
      {
        id: "veo-3.1-fast-generate-preview",
        name: "Veo 3.1 Fast",
        description: "Speed-focused video generation for rapid iteration",
        speedProfile: createVideoSpeedProfile(8_000),
        quality: "B",
        costPerSecond: 0.35
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "720p", name: "720p HD", description: "HD resolution (all durations)" },
      { id: "1080p", name: "1080p Full HD", description: "Full HD (8s duration only)" },
      { id: "4k", name: "4K Ultra HD", description: "Ultra HD (8s duration only)" }
    ],
    durations: [4, 6, 8],
    aspectRatios: ["16:9", "9:16"]
  },
  runway: {
    name: "Runway",
    models: attachModelEstimations([
      {
        id: "gen4.5",
        name: "Gen-4.5",
        description: "Newest Runway model — best quality text/image-to-video (no audio)",
        speedProfile: createVideoSpeedProfile(21_000),
        quality: "A+",
        costPerSecond: 0.12
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "1920x1080", name: "1080p Landscape", description: "Full HD widescreen (16:9)" },
      { id: "1080x1920", name: "1080p Portrait", description: "Full HD vertical (9:16)" },
      { id: "1280x720", name: "720p Landscape", description: "HD widescreen (16:9)" },
      { id: "720x1280", name: "720p Portrait", description: "HD vertical (9:16)" }
    ],
    durations: [4, 6, 8]
  },
  deepinfra: {
    name: "DeepInfra Video",
    models: attachModelEstimations([
      {
        id: "Wan-AI/Wan2.1-T2V-1.3B",
        name: "Wan 2.1 T2V 1.3B",
        description: "DeepInfra-hosted text-to-video generation with lightweight Wan inference",
        speedProfile: createVideoSpeedProfile(18_000),
        quality: "B",
        costPerSecond: 0.02
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "832x480", name: "480p Landscape", description: "Fast widescreen render (16:9)" },
      { id: "480x832", name: "480p Portrait", description: "Fast vertical render (9:16)" }
    ],
    durations: [4, 8],
    aspectRatios: ["16:9", "9:16"]
  },
  minimax: {
    name: "MiniMax Hailuo",
    models: attachModelEstimations([
      {
        id: "MiniMax-Hailuo-2.3",
        name: "Hailuo 2.3",
        description: "Latest flagship model with 768P/1080P support and camera controls",
        speedProfile: createVideoSpeedProfile(19_000),
        quality: "A",
        costPerSecond: 0.04
      },
      {
        id: "MiniMax-Hailuo-02",
        name: "Hailuo 02",
        description: "High-quality video with 768P/1080P and extended duration",
        speedProfile: createVideoSpeedProfile(15_000),
        quality: "A",
        costPerSecond: 0.04
      },
      {
        id: "T2V-01-Director",
        name: "T2V Director",
        description: "Director-style video with camera angle controls",
        speedProfile: createVideoSpeedProfile(30_000),
        quality: "B",
        costPerSecond: 0.04
      },
      {
        id: "T2V-01",
        name: "T2V 01",
        description: "Standard text-to-video generation",
        speedProfile: createVideoSpeedProfile(22_000),
        quality: "B",
        costPerSecond: 0.04
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "768P", name: "768P HD", description: "HD resolution (6s or 10s)" },
      { id: "1080P", name: "1080P Full HD", description: "Full HD (6s only, Hailuo models)" },
      { id: "720P", name: "720P HD", description: "HD resolution (T2V models, 6s only)" }
    ],
    durations: [6, 10]
  },
  grok: {
    name: "Grok Video",
    models: attachModelEstimations([
      {
        id: "grok-imagine-video",
        name: "Grok Imagine Video",
        description: "High-quality video generation with multiple aspect ratios",
        speedProfile: createVideoSpeedProfile(7_000),
        quality: "A",
        costPerSecond: 0.05
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "720p", name: "720p HD", description: "HD resolution (1280x720)" },
      { id: "480p", name: "480p SD", description: "Standard definition (854x480)" }
    ],
    durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "4:3", "1:1", "9:16", "3:4", "3:2", "2:3"]
  },
  glm: {
    name: "GLM Video",
    models: attachModelEstimations([
      {
        id: "cogvideox-3",
        name: "CogVideoX-3",
        description: "High-quality text-to-video generation up to 4K resolution",
        speedProfile: createVideoSpeedProfile(18_000),
        quality: "A",
        costPerSecond: 0.04
      },
      {
        id: "viduq1-text",
        name: "ViduQ1",
        description: "1080P text-to-video generation with style controls",
        speedProfile: createVideoSpeedProfile(40_000),
        quality: "B",
        costPerSecond: 0.08
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "1920x1080", name: "1080p Landscape", description: "Full HD widescreen (16:9)" },
      { id: "1080x1920", name: "1080p Portrait", description: "Full HD vertical (9:16)" },
      { id: "1280x720", name: "720p Landscape", description: "HD widescreen (16:9)" }
    ],
    durations: [5]
  },
  deapi: {
    name: "deAPI Video",
    models: attachModelEstimations([
      {
        id: "Ltxv_13B_0_9_8_Distilled_FP8",
        name: "LTX Video 13B Distilled FP8",
        description: "Queued text-to-video generation through deAPI",
        speedProfile: createVideoSpeedProfile(18_000),
        quality: "B",
        costPerSecond: 0.02
      }
    ], buildVideoModelEstimation),
    sizes: [
      { id: "1280x720", name: "720p Landscape", description: "HD widescreen (16:9)" },
      { id: "720x1280", name: "720p Portrait", description: "HD vertical (9:16)" },
      { id: "1024x1024", name: "1024p Square", description: "Square output (1:1)" }
    ],
    durations: [4, 8],
    aspectRatios: ["16:9", "9:16", "1:1"]
  }
}
export const getDefaultVideoModel = (service: VideoGenServiceType = 'runway'): string => {
  if (service === 'minimax') return 'MiniMax-Hailuo-2.3'
  if (service === 'grok') return 'grok-imagine-video'
  if (service === 'runway') return 'gen4.5'
  const config = VIDEO_CONFIG[service]
  if (!config) return VIDEO_CONFIG.runway.models[0]!.id
  return config.models[0]!.id
}

export const getDefaultVideoSize = (service: VideoGenServiceType = 'runway'): string => {
  if (service === 'gemini') return '720p'
  if (service === 'deepinfra') return '832x480'
  if (service === 'minimax') return '768P'
  if (service === 'grok') return '720p'
  if (service === 'runway') return '1280x720'
  if (service === 'deapi') return '1280x720'
  return '1280x720'
}

export const requiresExplicitVideoAspectRatioSelection = (
  service: VideoGenServiceType | undefined
): boolean => {
  if (!service) return false

  return service === 'gemini' && !!VIDEO_CONFIG[service]?.aspectRatios?.length
}

const getVideoModelsForService = (service: VideoGenServiceType): string[] => {
  const config = VIDEO_CONFIG[service]
  return config ? config.models.map(model => model.id) : []
}

export const isValidVideoModel = (service: VideoGenServiceType, model: string): boolean => {
  return getVideoModelsForService(service).includes(model)
}
