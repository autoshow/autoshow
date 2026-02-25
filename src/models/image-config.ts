import type { ImageConfig } from '~/types'

export const IMAGE_CONFIG: ImageConfig = {
  openai: {
    name: "ChatGPT Image",
    models: [
      {
        id: "gpt-image-1.5",
        name: "GPT Image 1.5",
        description: "State of the art image generation with best overall quality",
        speed: "B",
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
        speed: "B",
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
        speed: "A",
        quality: "B",
        costPerImage: {
          "1024x1024": 0.005,
          "1536x1024": 0.006,
          "1024x1536": 0.006
        }
      }
    ],
    dimensions: [
      { id: "1024x1024", name: "1024x1024 (square)" },
      { id: "1536x1024", name: "1536x1024 (landscape)" },
      { id: "1024x1536", name: "1024x1536 (portrait)" }
    ]
  },
  gemini: {
    name: "Gemini Image",
    models: [
      {
        id: "gemini-2.5-flash-image",
        name: "Gemini 2.5 Flash",
        description: "Fast and efficient native image generation (1024px max)",
        speed: "A",
        quality: "B",
        costPerImage: 0.02
      },
      {
        id: "gemini-3-pro-image-preview",
        name: "Gemini 3 Pro Preview",
        description: "Professional asset production with advanced reasoning (up to 4K)",
        speed: "C",
        quality: "A",
        costPerImage: 0.08
      }
    ],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  },
  minimax: {
    name: "MiniMax Image",
    models: [
      {
        id: "image-01",
        name: "Image 01",
        description: "High-quality image generation with diverse aspect ratios",
        speed: "B",
        quality: "A",
        costPerImage: 0.0035
      }
    ],
    aspectRatios: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"]
  },
  grok: {
    name: "Grok Image",
    models: [
      {
        id: "grok-imagine-image",
        name: "Grok Imagine",
        description: "xAI image generation with Aurora model",
        speed: "B",
        quality: "A",
        costPerImage: 0.02
      }
    ],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
  }
}

export const getImageModelsForService = (service: keyof ImageConfig): string[] => {
  const config = IMAGE_CONFIG[service]
  return config ? config.models.map(model => model.id) : []
}

export const getDefaultImageModelForService = (service: keyof ImageConfig): string => {
  return getImageModelsForService(service)[0] || ''
}

export const isValidImageModel = (service: keyof ImageConfig, model: string): boolean => {
  return getImageModelsForService(service).includes(model)
}
