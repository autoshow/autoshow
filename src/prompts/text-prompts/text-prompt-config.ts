import type { PromptType, PromptConfig } from '~/types'
import { SUMMARIES_AND_OVERVIEWS } from './summaries-and-overviews'
import { CHAPTERS } from './chapters'
import { SOCIAL_MEDIA_POSTS } from './social-media-posts'
import { CREATIVE_WRITING } from './creative-writing'
import { MARKETING_CONTENT } from './marketing-content'
import { EDUCATIONAL } from './educational'
import { LEARNING_RESOURCES } from './learning-resources'
import { BUSINESS_ANALYSIS } from './business-analysis'
import { PERSONAL_GROWTH } from './personal-growth'

export const PROMPT_CONFIG = {
  ...SUMMARIES_AND_OVERVIEWS,
  ...CHAPTERS,
  ...SOCIAL_MEDIA_POSTS,
  ...CREATIVE_WRITING,
  ...MARKETING_CONTENT,
  ...EDUCATIONAL,
  ...LEARNING_RESOURCES,
  ...BUSINESS_ANALYSIS,
  ...PERSONAL_GROWTH
} as Record<PromptType, PromptConfig>

export const PROMPT_TYPES = Object.keys(PROMPT_CONFIG) as PromptType[]
