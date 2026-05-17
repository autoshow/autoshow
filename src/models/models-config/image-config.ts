import { attachModelEstimations,buildImageModelEstimation } from '~/models/models-utils/estimate-speed'
import { createImageSpeedProfile } from '~/models/models-utils/speed'
import type { ImageConfig } from '~/types'

export const IMAGE_CONFIG: ImageConfig = {
  openai: {
    name: "ChatGPT Image",
    models: attachModelEstimations([
      {
        id: "gpt-image-1.5",
        name: "GPT Image 1.5",
        description: "State of the art image generation with best overall quality",
        speedProfile: createImageSpeedProfile(35_200),
        quality: "A",
        costPerImage: {
          "1024x1024": 0.009,
          "1536x1024": 0.011,
          "1024x1536": 0.011
        }
      },
      {
        id: "gpt-image-1",
        name: "GPT Image 1",
        description: "Advanced AI image generation with superior instruction following and text rendering",
        speedProfile: createImageSpeedProfile(35_200),
        quality: "A",
        costPerImage: {
          "1024x1024": 0.009,
          "1536x1024": 0.011,
          "1024x1536": 0.011
        }
      },
      {
        id: "gpt-image-1-mini",
        name: "GPT Image 1 Mini",
        description: "Cost-effective image generation for high-volume tasks",
        speedProfile: createImageSpeedProfile(32_800),
        quality: "B",
        costPerImage: {
          "1024x1024": 0.005,
          "1536x1024": 0.006,
          "1024x1536": 0.006
        }
      }
    ], buildImageModelEstimation),
    dimensions: [
      { id: "1024x1024", name: "1024x1024 (square)" },
      { id: "1536x1024", name: "1536x1024 (landscape)" },
      { id: "1024x1536", name: "1024x1536 (portrait)" }
    ]
  },
  gemini: {
    name: "Gemini Image",
    models: attachModelEstimations([
      {
        id: "gemini-2.5-flash-image",
        name: "Gemini 2.5 Flash",
        description: "Fast and efficient native image generation (1024px max)",
        speedProfile: createImageSpeedProfile(8_000),
        quality: "B",
        costPerImage: 0.02
      },
      {
        id: "gemini-3-pro-image-preview",
        name: "Gemini 3 Pro Preview",
        description: "Professional asset production with advanced reasoning (up to 4K)",
        speedProfile: createImageSpeedProfile(14_000),
        quality: "A",
        costPerImage: 0.08
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  },
  minimax: {
    name: "MiniMax Image",
    models: attachModelEstimations([
      {
        id: "image-01",
        name: "Image 01",
        description: "High-quality image generation with diverse aspect ratios",
        speedProfile: createImageSpeedProfile(3_000),
        quality: "A",
        costPerImage: 0.0035
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"]
  },
  grok: {
    name: "Grok Image",
    models: attachModelEstimations([
      {
        id: "grok-imagine-image",
        name: "Grok Imagine",
        description: "xAI image generation with Aurora model",
        speedProfile: createImageSpeedProfile(5_000),
        quality: "A",
        costPerImage: 0.02
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  },
  runway: {
    name: "Runway Image",
    models: attachModelEstimations([
      {
        id: "gen4_image",
        name: "Gen-4 Image",
        description: "Runway text-to-image generation with ratio-based prompting",
        speedProfile: createImageSpeedProfile(12_000),
        quality: "A",
        costPerImage: {
          "1:1": 0.05,
          "16:9": 0.08,
          "9:16": 0.08,
          "4:3": 0.05
        }
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3"]
  },
  deepinfra: {
    name: "DeepInfra Image",
    models: attachModelEstimations([
      {
        id: "black-forest-labs/FLUX-2-klein-4b",
        name: "FLUX 2 Klein 4B",
        description: "DeepInfra-hosted FLUX text-to-image generation",
        speedProfile: createImageSpeedProfile(1_700),
        quality: "B",
        costPerImage: 0.014
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  },
  deapi: {
    name: "deAPI Image",
    models: attachModelEstimations([
      {
        id: "Flux1schnell",
        name: "Flux 1 Schnell",
        description: "Queued deAPI text-to-image generation",
        speedProfile: createImageSpeedProfile(25_700),
        quality: "B",
        costPerImage: 0.0014
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  },
  flux: {
    name: "Flux Image",
    models: attachModelEstimations([
      {
        id: "flux-2-klein-4b",
        name: "Flux 2 Klein 4B",
        description: "Fast and efficient 4B parameter model",
        speedProfile: createImageSpeedProfile(5_800),
        quality: "B",
        costPerImage: 0.014
      },
      {
        id: "flux-2-klein-9b",
        name: "Flux 2 Klein 9B",
        description: "Balanced 9B parameter model with better quality",
        speedProfile: createImageSpeedProfile(6_200),
        quality: "A",
        costPerImage: 0.015
      },
      {
        id: "flux-2-pro",
        name: "Flux 2 Pro",
        description: "Professional quality image generation",
        speedProfile: createImageSpeedProfile(18_000),
        quality: "A",
        costPerImage: 0.03
      },
      {
        id: "flux-2-max",
        name: "Flux 2 Max",
        description: "Maximum quality flagship model",
        speedProfile: createImageSpeedProfile(35_000),
        quality: "A",
        costPerImage: 0.06
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  },
  glm: {
    name: "GLM Image",
    models: attachModelEstimations([
      {
        id: "glm-image",
        name: "GLM Image",
        description: "High-quality image generation from Z.AI",
        speedProfile: createImageSpeedProfile(13_800),
        quality: "A",
        costPerImage: 0.015
      },
      {
        id: "cogView-4-250304",
        name: "CogView 4",
        description: "Cost-effective image generation with CogView architecture",
        speedProfile: createImageSpeedProfile(13_800),
        quality: "B",
        costPerImage: 0.010
      }
    ], buildImageModelEstimation),
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  }
}

const getImageModelsForService = (service: keyof ImageConfig): string[] => {
  const config = IMAGE_CONFIG[service]
  return config ? config.models.map(model => model.id) : []
}

export const getDefaultImageModelForService = (service: keyof ImageConfig): string => {
  return getImageModelsForService(service)[0] || ''
}

export const isValidImageModel = (service: keyof ImageConfig, model: string): boolean => {
  return getImageModelsForService(service).includes(model)
}
