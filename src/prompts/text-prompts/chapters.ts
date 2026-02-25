import type { PromptType, PromptConfig } from '~/types'

const CHAPTER_SCHEMA = {
  type: 'object',
  properties: {
    timestamp: { type: 'string', description: 'Timestamp in HH:MM:SS format' },
    title: { type: 'string', description: 'Chapter title' },
    description: { type: 'string', description: 'Chapter description' }
  },
  required: ['timestamp', 'title', 'description'],
  additionalProperties: false
}

export const CHAPTERS: Partial<Record<PromptType, PromptConfig>> = {
  shortChapters: {
    title: "Short Chapters",
    displayTitle: "Short Chapters",
    category: "Chapters",
    renderType: 'chapters',
    schema: {
      type: 'array',
      items: CHAPTER_SCHEMA,
      description: 'Chapters with one-sentence descriptions'
    },
    llmInstruction: 'Generate "shortChapters": an array of timestamped chapters. Each chapter has "timestamp" (HH:MM:SS format), "title", and "description" (one sentence). Chapters should be 3-6 minutes long and cover the entire content.',
    markdownInstruction: `- Create chapter titles and one-sentence descriptions based on the topics discussed.
  - Include only starting timestamps in exact HH:MM:SS format, always using two digits each for hours, minutes, and seconds.
  - Chapters should be roughly 3-6 minutes long.
  - Ensure chapters cover the entire content, clearly noting the last timestamp (HH:MM:SS), indicating total duration.
  - Descriptions should flow naturally from the content.`,
    markdownExample: `## Chapters
### 00:00:00 - Introduction and Episode Overview
Briefly introduces the episode's main themes, setting the stage for detailed discussions ahead.`
  },
  mediumChapters: {
    title: "Medium Chapters",
    displayTitle: "Medium Chapters",
    category: "Chapters",
    renderType: 'chapters',
    schema: {
      type: 'array',
      items: CHAPTER_SCHEMA,
      description: 'Chapters with ~50 word descriptions'
    },
    llmInstruction: 'Generate "mediumChapters": an array of timestamped chapters. Each chapter has "timestamp" (HH:MM:SS format), "title", and "description" (~50 words). Chapters should be 3-6 minutes long and cover the entire content.',
    markdownInstruction: `- Create chapter titles and one-paragraph descriptions based on the topics discussed.
  - Include only starting timestamps in exact HH:MM:SS format, always using two digits each for hours, minutes, and seconds.
  - Chapters should be roughly 3-6 minutes long.
  - Write descriptions of about 50 words each.
  - Ensure chapters cover the entire content, clearly noting the last timestamp (HH:MM:SS), indicating total duration.
  - Descriptions should flow naturally from the content.`,
    markdownExample: `## Chapters
### 00:00:00 - Introduction and Overview
Introduces the key themes and concepts explored in the episode, briefly outlining the significant points and their relevance to broader discussions. This foundation helps listeners grasp the scope and importance of the subsequent content and prepares them for deeper exploration of each topic.`
  },
  longChapters: {
    title: "Long Chapters",
    displayTitle: "Long Chapters",
    category: "Chapters",
    renderType: 'chapters',
    schema: {
      type: 'array',
      items: CHAPTER_SCHEMA,
      description: 'Chapters with 75+ word descriptions'
    },
    llmInstruction: 'Generate "longChapters": an array of timestamped chapters. Each chapter has "timestamp" (HH:MM:SS format), "title", and "description" (75+ words, two paragraphs). Chapters should be 3-6 minutes long and cover the entire content.',
    markdownInstruction: `- Create chapter titles and descriptions based on the topics discussed throughout.
  - Include only starting timestamps in exact HH:MM:SS format, always using two digits each for hours, minutes, and seconds.
  - Chapters should each cover approximately 3-6 minutes of content.
  - Write a two-paragraph description (75+ words) for each chapter.
  - Ensure chapters cover the entire content, clearly noting the last timestamp (HH:MM:SS), indicating total duration.
  - Descriptions should flow naturally from the content, avoiding formulaic language.`,
    markdownExample: `## Chapters
### 00:00:00 - Introduction and Overview
A comprehensive introduction providing readers with the main themes and concepts explored throughout the chapter. The content highlights significant points discussed in detail and explores their broader implications and practical relevance.
Connections are made between concepts, emphasizing interrelationships and potential impacts on various fields or current challenges. The chapter sets a clear foundation for understanding the subsequent discussions.`
  }
}
