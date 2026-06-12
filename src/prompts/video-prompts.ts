import type { VideoPromptConfig,VideoPromptType,SourcePromptsVideoPromptsWrapVideoPromptOptions as WrapVideoPromptOptions } from '~/types'

const VIDEO_SAFETY_PREFIX = `Note: Avoid depicting violence, explicit content, real public figures, clearly illegal activities, or named/identifiable real people from the source material.
If the scene implies a person, render an anonymous adult subject described only by role, clothing, or mood. Do not use real names, exact likenesses, or recognizable logos/trademarks.

SCENE DESCRIPTION:
`

const LABEL_PREFIX_PATTERN = /\b(Shot Type|Subject|Action\/Motion|Setting|Lighting|Camera Movement):\s*/g

const buildCompactSafetyPrompt = (sceneDescription: string): string => {
  const plainScene = sceneDescription
    .replace(LABEL_PREFIX_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()

  return `Safe cinematic video prompt. Use anonymous adult subjects only. Avoid real names, public figures, exact likenesses, logos, violence, explicit content, and illegal activity. ${plainScene}`.trim()
}

export const wrapWithSafetyPrefix = (sceneDescription: string, options: WrapVideoPromptOptions = {}): string => {
  if (options.mode === 'compact') {
    return buildCompactSafetyPrompt(sceneDescription)
  }

  return VIDEO_SAFETY_PREFIX + sceneDescription
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
