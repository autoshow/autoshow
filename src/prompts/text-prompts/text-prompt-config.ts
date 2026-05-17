import type { PromptConfig,PromptType } from '~/types'
import { BUSINESS_ANALYSIS } from './business-analysis'
import { CHAPTERS } from './chapters'
import { CREATIVE_WRITING } from './creative-writing'
import { EDUCATIONAL } from './educational'
import { LEARNING_RESOURCES } from './learning-resources'
import { MARKETING_CONTENT } from './marketing-content'
import { PERSONAL_GROWTH } from './personal-growth'
import { SOCIAL_MEDIA_POSTS } from './social-media-posts'
import { SUMMARIES_AND_OVERVIEWS } from './summaries-and-overviews'

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
