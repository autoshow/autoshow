import type { VideoPromptType, VideoPromptConfig, VideoSize, TranscriptionResult, VideoMetadata } from '~/types'

const SORA_SAFETY_PREFIX = `Note: Avoid depicting violence, explicit content, real public figures, or clearly illegal activities.

SCENE DESCRIPTION:
`

export const wrapWithSafetyPrefix = (sceneDescription: string): string => {
  return SORA_SAFETY_PREFIX + sceneDescription
}

export const VIDEO_PROMPT_CONFIG: Record<VideoPromptType, VideoPromptConfig> = {
  explainer: {
    title: "Explainer",
    description: "Educational video that visually demonstrates key concepts from the content",
    typeDescription: "an educational explainer video that visually demonstrates key concepts with clear, instructive visuals",
    styleInstructions: `Style: Educational and clear. Use diagrams, data visualizations, process flows, or conceptual imagery that helps explain ideas. Clean compositions with good visual hierarchy. Instructive camera movements that guide the viewer through concepts.`
  },
  highlight: {
    title: "Highlight Reel",
    description: "Dynamic montage showcasing the most important moments",
    typeDescription: "a dynamic highlight reel showcasing the most compelling moments and themes",
    styleInstructions: `Style: Dynamic and energetic. Bold compositions, dramatic lighting, and impactful visuals. Quick cuts feel, multiple focal points, and high-contrast imagery. Cinematic and attention-grabbing.`
  },
  intro: {
    title: "Intro Sequence",
    description: "Professional opening sequence to introduce the content",
    typeDescription: "a captivating opening sequence that sets the tone and draws viewers in",
    styleInstructions: `Style: Cinematic and inviting. Establishing shots, atmospheric lighting, and a sense of anticipation. Build curiosity and set expectations. Professional broadcast quality feel.`
  },
  outro: {
    title: "Outro Sequence",
    description: "Closing sequence that summarizes and wraps up the content",
    typeDescription: "a memorable closing sequence that leaves a lasting impression",
    styleInstructions: `Style: Reflective and conclusive. Calming visuals that signal completion. Sunset/twilight moods, gentle movements, and a sense of resolution. Leave the viewer satisfied.`
  },
  social: {
    title: "Social Clip",
    description: "Short, engaging clip optimized for social media platforms",
    typeDescription: "a punchy, scroll-stopping social media clip optimized for engagement",
    styleInstructions: `Style: Bold and immediate. High-contrast, vibrant colors, and eye-catching motion. Designed to stop the scroll. Vertical-friendly compositions, punchy visuals, and instant impact.`
  }
}

export const VIDEO_PROMPT_TYPES = Object.keys(VIDEO_PROMPT_CONFIG) as VideoPromptType[]

export const buildVideoScenePrompt = (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  videoType: VideoPromptType,
  size: VideoSize,
  duration: number
): string => {
  const config = VIDEO_PROMPT_CONFIG[videoType]
  
  const isPortrait = size === '1080x1920' || size === '720x1280'
  const orientationNote = isPortrait 
    ? 'The video is in PORTRAIT orientation (vertical) - compose shots accordingly with subjects centered and vertical framing.'
    : 'The video is in LANDSCAPE orientation (horizontal) - compose shots with cinematic widescreen framing.'

  return `You are an expert video director and cinematographer. Based on the following content, write a detailed scene description for ${config.typeDescription}.

${config.styleInstructions}

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
