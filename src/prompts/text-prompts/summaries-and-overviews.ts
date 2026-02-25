import type { PromptType, PromptConfig } from '~/types'

export const SUMMARIES_AND_OVERVIEWS: Partial<Record<PromptType, PromptConfig>> = {
  shortSummary: {
    title: "Short Summary",
    displayTitle: "Episode Description",
    category: "Summaries",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A one-sentence description (max 180 characters)'
    },
    llmInstruction: 'Generate a "shortSummary": a one-sentence description (max 180 characters) encapsulating the content.',
    markdownInstruction: `- Write a one-sentence description of the transcript.
  - The one-sentence description shouldn't exceed 180 characters (roughly 30 words).`,
    markdownExample: `## Episode Description

One sentence description encapsulating the content within roughly 180 characters.`
  },
  mediumSummary: {
    title: "Medium Summary",
    displayTitle: "Episode Overview",
    category: "Summaries",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A medium-length summary (300-600 characters)'
    },
    llmInstruction: 'Generate a "mediumSummary": a medium-length summary (300-600 characters) providing a concise overview of the main points.',
    markdownInstruction: `- Write a medium-length summary of the transcript.
  - The medium-length summary should be approximately 300-600 characters (roughly 50-100 words).`,
    markdownExample: `## Episode Overview

A medium-length summary of the transcript, typically 300-600 characters or about 50-100 words, providing a concise overview of the main points and themes.`
  },
  longSummary: {
    title: "Long Summary",
    displayTitle: "Episode Summary",
    category: "Summaries",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A one-paragraph summary (600-1200 characters)'
    },
    llmInstruction: 'Generate a "longSummary": a one-paragraph summary (600-1200 characters) highlighting main topics and key points.',
    markdownInstruction: `- Write a one-paragraph summary of the transcript.
  - The one-paragraph summary should be approximately 600-1200 characters (roughly 100-200 words).`,
    markdownExample: `## Episode Summary

A concise summary of the transcript, typically 600-1200 characters or about 100-200 words, highlighting main topics, significant points, methods, conclusions, and implications.`
  },
  bulletPoints: {
    title: "Bullet Points",
    displayTitle: "Key Points",
    category: "Overviews",
    renderType: 'stringList',
    schema: {
      type: 'array',
      items: { type: 'string' },
      description: 'Bullet point list of key topics'
    },
    llmInstruction: 'Generate "bulletPoints": an array of bullet points summarizing key topics and insights.',
    markdownInstruction: `- Write a bullet point list summarizing the transcript.`,
    markdownExample: `## Bullet Point Summary
- A concise summary of a chapter's content in bullet point list form.
- It begins by introducing the main topic or theme of the chapter, providing context for the reader.
- The summary then outlines key points or arguments presented in the chapter`
  },
  takeaways: {
    title: "Key Takeaways",
    displayTitle: "Key Takeaways",
    category: "Overviews",
    renderType: 'numberedList',
    schema: {
      type: 'array',
      items: { type: 'string' },
      description: 'Three key takeaways'
    },
    llmInstruction: 'Generate "takeaways": an array of exactly 3 key takeaways the listener should remember.',
    markdownInstruction: `- Include three key takeaways the listener should get from the episode.`,
    markdownExample: `## Key Takeaways
1. Full-stack development requires a broad understanding of both client-side and server-side technologies, enabling developers to create more cohesive and efficient web applications.
2. Modern front-end frameworks like React and Vue.js have revolutionized UI development, emphasizing component-based architecture and reactive programming paradigms.
3. Backend technologies like Node.js and cloud services have made it easier to build scalable, high-performance web applications, but require careful consideration of security and data management practices.`
  },
  faq: {
    title: "FAQ",
    displayTitle: "FAQ",
    category: "Overviews",
    renderType: 'faq',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question' },
          answer: { type: 'string', description: 'The answer' }
        },
        required: ['question', 'answer'],
        additionalProperties: false
      },
      description: '5-10 frequently asked questions and answers'
    },
    llmInstruction: 'Generate "faq": an array of 5-10 objects with "question" and "answer" fields covering major content.',
    markdownInstruction: `- Include a list of 5-10 frequently asked questions and answers based on the transcript.
  - Ensure questions and answers cover all major sections of the content.`,
    markdownExample: `## FAQ
Q: What are the three main components of the Jamstack?
A: JavaScript, APIs, and markup.`
  },
  quotes: {
    title: "Important Quotes",
    displayTitle: "Important Quotes",
    category: "Overviews",
    renderType: 'numberedList',
    schema: {
      type: 'array',
      items: { type: 'string' },
      description: 'Five most important quotes'
    },
    llmInstruction: 'Generate "quotes": an array of exactly 5 important and impactful quotes from the transcript.',
    markdownInstruction: `- Select the five most important and impactful quotes from the transcript.`,
    markdownExample: `## Important Quotes
1. "First important quote from the episode."
2. "Second important quote from the episode."
3. "Third important quote from the episode."
4. "Fourth important quote from the episode."
5. "Fifth important quote from the episode."`
  },
  titles: {
    title: "Potential Titles",
    displayTitle: "Potential Titles",
    category: "Overviews",
    renderType: 'numberedList',
    schema: {
      type: 'array',
      items: { type: 'string' },
      description: 'Five potential titles'
    },
    llmInstruction: 'Generate "titles": an array of 5 potential titles. The first two should be very short with no subtitle. The last three can be longer and include subtitles.',
    markdownInstruction: `- Write 5 potential titles for the video.
  - The first two titles should be very short and have no subtitle.
  - The last three titles can be longer and include subtitles.`,
    markdownExample: `## Potential Titles
1. Title Hard
2. Title Harder
3. Title Hard with a Vengeance
4. Title Hard IV: Live Free or Title Hard
5. Title Hard V: A Good Day to Die Hard`
  }
}
