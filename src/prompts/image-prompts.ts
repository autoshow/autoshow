export const IMAGE_PROMPT_TEMPLATES: Record<string, string> = {
  keyMoment: `Based on this content, create a compelling image that captures the single most important moment, concept, or idea discussed. The image should be visually striking and immediately communicate the core message.

Content title: {title}
Summary: {summary}`,
  
  thumbnail: `Create an eye-catching, professional thumbnail image suitable for social media and video platforms. The image should be attention-grabbing, visually appealing, and clearly represent the content's main topic.

Content title: {title}
Summary: {summary}`,
  
  conceptual: `Generate abstract or conceptual artwork that artistically represents the themes, ideas, and essence of this discussion. Use symbolism, metaphor, and artistic expression to capture the deeper meaning.

Content title: {title}
Summary: {summary}`,
  
  infographic: `Create an infographic-style image that visually summarizes the key points, statistics, or concepts from this content. Use clean design, icons, and visual hierarchy to make information easy to digest.

Content title: {title}
Summary: {summary}`,
  
  character: `Generate an image depicting characters, scenes, or scenarios that were discussed or referenced in this content. Bring the narrative elements to life visually.

Content title: {title}
Summary: {summary}`,
  
  quote: `Create a visually stunning image featuring a memorable quote or key statement from this content. Design it as an inspirational quote image with beautiful typography and relevant background imagery.

Content title: {title}
Summary: {summary}`
}
