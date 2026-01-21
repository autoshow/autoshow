import type { VideoPromptType, VideoSize } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import type { VideoMetadata } from '~/types/main'

export const SORA_SAFETY_PREFIX = `Note: Avoid depicting violence, explicit content, real public figures, or clearly illegal activities.

SCENE DESCRIPTION:
`

export const wrapWithSafetyPrefix = (sceneDescription: string): string => {
  return SORA_SAFETY_PREFIX + sceneDescription
}

export const getVideoTypeDescription = (videoType: VideoPromptType): string => {
  const descriptions: Record<VideoPromptType, string> = {
    explainer: 'an educational explainer video that visually demonstrates key concepts with clear, instructive visuals',
    highlight: 'a dynamic highlight reel showcasing the most compelling moments and themes',
    intro: 'a captivating opening sequence that sets the tone and draws viewers in',
    outro: 'a memorable closing sequence that leaves a lasting impression',
    social: 'a punchy, scroll-stopping social media clip optimized for engagement'
  }
  
  return descriptions[videoType]
}

export const getVideoStyleInstructions = (videoType: VideoPromptType): string => {
  const styleInstructions: Record<VideoPromptType, string> = {
    explainer: `Style: Educational and clear. Use diagrams, data visualizations, process flows, or conceptual imagery that helps explain ideas. Clean compositions with good visual hierarchy. Instructive camera movements that guide the viewer through concepts.`,
    
    highlight: `Style: Dynamic and energetic. Bold compositions, dramatic lighting, and impactful visuals. Quick cuts feel, multiple focal points, and high-contrast imagery. Cinematic and attention-grabbing.`,
    
    intro: `Style: Cinematic and inviting. Establishing shots, atmospheric lighting, and a sense of anticipation. Build curiosity and set expectations. Professional broadcast quality feel.`,
    
    outro: `Style: Reflective and conclusive. Calming visuals that signal completion. Sunset/twilight moods, gentle movements, and a sense of resolution. Leave the viewer satisfied.`,
    
    social: `Style: Bold and immediate. High-contrast, vibrant colors, and eye-catching motion. Designed to stop the scroll. Vertical-friendly compositions, punchy visuals, and instant impact.`
  }
  
  return styleInstructions[videoType]
}

export const buildVideoScenePrompt = (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  videoType: VideoPromptType,
  size: VideoSize,
  duration: number
): string => {
  const typeDescription = getVideoTypeDescription(videoType)
  const styleInstructions = getVideoStyleInstructions(videoType)
  
  const isPortrait = size === '1080x1920' || size === '720x1280'
  const orientationNote = isPortrait 
    ? 'The video is in PORTRAIT orientation (vertical) - compose shots accordingly with subjects centered and vertical framing.'
    : 'The video is in LANDSCAPE orientation (horizontal) - compose shots with cinematic widescreen framing.'

  return `You are an expert video director and cinematographer. Based on the following content, write a detailed scene description for ${typeDescription}.

${styleInstructions}

Video Specifications:
- Duration: ${duration} seconds
- Resolution: ${size}
- ${orientationNote}

Content Title: ${metadata.title}
${metadata.author ? `Author/Creator: ${metadata.author}` : ''}

Content Summary (from transcript):
${transcription.text.substring(0, 3000)}

Write a single, cohesive scene description that Sora can render as one continuous ${duration}-second video. Include:

1. **Shot Type**: Camera angle and framing (wide shot, close-up, tracking shot, aerial view, etc.)
2. **Subject**: Main visual focus - be creative and specific to THIS content's themes
3. **Action/Motion**: What movement or changes occur throughout the ${duration} seconds
4. **Setting**: The environment or backdrop that fits the content's mood
5. **Lighting**: Lighting style that enhances the visual storytelling
6. **Camera Movement**: How the camera moves during the shot

Be creative and specific to the actual content. The scene should visually represent the themes and ideas from the transcript.

Write ONLY the scene description, no additional commentary.

Scene Description:`
}

export const VIDEO_PROMPT_TEMPLATES: Record<VideoPromptType, string> = {
  explainer: `Create an educational explainer video that visually demonstrates the key concepts. Use clear imagery, conceptual visualizations, or metaphorical scenes that help viewers understand the ideas being discussed.

Content title: {title}
Summary: {summary}`,

  highlight: `Create a dynamic highlight video with bold, cinematic visuals. Capture the energy and key themes with dramatic compositions, striking imagery, and compelling motion.

Content title: {title}
Summary: {summary}`,

  intro: `Create an inviting intro sequence that establishes atmosphere and builds anticipation. Set the tone for what's to come with cinematic establishing shots and a sense of beginning.

Content title: {title}
Summary: {summary}`,

  outro: `Create a satisfying outro sequence that provides closure. Use reflective, calming visuals that signal completion while leaving a memorable impression.

Content title: {title}
Summary: {summary}`,

  social: `Create an attention-grabbing social media clip with bold colors, dynamic motion, and instant visual impact. Designed to stop the scroll and engage viewers immediately.

Content title: {title}
Summary: {summary}`
}
