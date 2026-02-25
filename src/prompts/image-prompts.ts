import type { ImagePromptType, ImagePromptConfig } from '~/types'

export const IMAGE_PROMPT_CONFIG: Record<ImagePromptType, ImagePromptConfig> = {
  keyMoment: {
    title: "Key Moment",
    description: "Generate an image representing the most important moment or concept from the content",
    template: `Based on this content, create a compelling image that captures the single most important moment, concept, or idea discussed. The image should be visually striking and immediately communicate the core message.

Content title: {title}
Text Output: {textOutput}`
  },
  thumbnail: {
    title: "Thumbnail",
    description: "Create an eye-catching thumbnail image suitable for social media or video platforms",
    template: `Create an eye-catching, professional thumbnail image suitable for social media and video platforms. The image should be attention-grabbing, visually appealing, and clearly represent the content's main topic.

Content title: {title}
Text Output: {textOutput}`
  },
  conceptual: {
    title: "Conceptual Art",
    description: "Generate abstract or conceptual artwork that captures the essence of the discussion",
    template: `Generate abstract or conceptual artwork that artistically represents the themes, ideas, and essence of this discussion. Use symbolism, metaphor, and artistic expression to capture the deeper meaning.

Content title: {title}
Text Output: {textOutput}`
  },
  infographic: {
    title: "Infographic Style",
    description: "Create an infographic-style image summarizing key points visually",
    template: `Create an infographic-style image that visually summarizes the key points, statistics, or concepts from this content. Use clean design, icons, and visual hierarchy to make information easy to digest.

Content title: {title}
Text Output: {textOutput}`
  },
  character: {
    title: "Character/Scene",
    description: "Generate an image of characters or scenes discussed in the content",
    template: `Generate an image depicting characters, scenes, or scenarios that were discussed or referenced in this content. Bring the narrative elements to life visually.

Content title: {title}
Text Output: {textOutput}`
  },
  quote: {
    title: "Quote Visual",
    description: "Create a visual representation of a memorable quote from the content",
    template: `Create a visually stunning image featuring a memorable quote or key statement from this content. Design it as an inspirational quote image with beautiful typography and relevant background imagery.

Content title: {title}
Text Output: {textOutput}`
  }
}

export const IMAGE_PROMPT_TYPES = Object.keys(IMAGE_PROMPT_CONFIG) as ImagePromptType[]
