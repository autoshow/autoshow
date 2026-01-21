export const PROMPT_SECTIONS = {
  shortSummary: {
    instruction: `- Write a one-sentence description of the transcript.
  - The one-sentence description shouldn't exceed 180 characters (roughly 30 words).`,
    example: `## Episode Description

One sentence description encapsulating the content within roughly 180 characters.`
  },
  longSummary: {
    instruction: `- Write a one-paragraph summary of the transcript.
  - The one-paragraph summary should be approximately 600-1200 characters (roughly 100-200 words).`,
    example: `## Episode Summary

A concise summary of the transcript, typically 600-1200 characters or about 100-200 words, highlighting main topics, significant points, methods, conclusions, and implications.`
  },
  bulletPoints: {
    instruction: `- Write a bullet point list summarizing the transcript.`,
    example: `## Bullet Point Summary
- A concise summary of a chapter's content in bullet point list form.
- It begins by introducing the main topic or theme of the chapter, providing context for the reader.
- The summary then outlines key points or arguments presented in the chapter`
  },
  takeaways: {
    instruction: `- Include three key takeaways the listener should get from the episode.`,
    example: `## Key Takeaways
1. Full-stack development requires a broad understanding of both client-side and server-side technologies, enabling developers to create more cohesive and efficient web applications.
2. Modern front-end frameworks like React and Vue.js have revolutionized UI development, emphasizing component-based architecture and reactive programming paradigms.
3. Backend technologies like Node.js and cloud services have made it easier to build scalable, high-performance web applications, but require careful consideration of security and data management practices.`
  },
  faq: {
    instruction: `- Include a list of 5-10 frequently asked questions and answers based on the transcript.
  - Ensure questions and answers cover all major sections of the content.`,
    example: `## FAQ
Q: What are the three main components of the Jamstack?
A: JavaScript, APIs, and markup.`
  },
  shortChapters: {
    instruction: `- Create chapter titles and one-sentence descriptions based on the topics discussed.
  - Include only starting timestamps in exact HH:MM:SS format, always using two digits each for hours, minutes, and seconds.
  - Chapters should be roughly 3-6 minutes long.
  - Ensure chapters cover the entire content, clearly noting the last timestamp (HH:MM:SS), indicating total duration.
  - Descriptions should flow naturally from the content.`,
    example: `## Chapters
### 00:00:00 - Introduction and Episode Overview
Briefly introduces the episode's main themes, setting the stage for detailed discussions ahead.`
  },
  mediumChapters: {
    instruction: `- Create chapter titles and one-paragraph descriptions based on the topics discussed.
  - Include only starting timestamps in exact HH:MM:SS format, always using two digits each for hours, minutes, and seconds.
  - Chapters should be roughly 3-6 minutes long.
  - Write descriptions of about 50 words each.
  - Ensure chapters cover the entire content, clearly noting the last timestamp (HH:MM:SS), indicating total duration.
  - Descriptions should flow naturally from the content.`,
    example: `## Chapters
### 00:00:00 - Introduction and Overview
Introduces the key themes and concepts explored in the episode, briefly outlining the significant points and their relevance to broader discussions. This foundation helps listeners grasp the scope and importance of the subsequent content and prepares them for deeper exploration of each topic.`
  },
  longChapters: {
    instruction: `- Create chapter titles and descriptions based on the topics discussed throughout.
  - Include only starting timestamps in exact HH:MM:SS format, always using two digits each for hours, minutes, and seconds.
  - Chapters should each cover approximately 3-6 minutes of content.
  - Write a two-paragraph description (75+ words) for each chapter.
  - Ensure chapters cover the entire content, clearly noting the last timestamp (HH:MM:SS), indicating total duration.
  - Descriptions should flow naturally from the content, avoiding formulaic language.`,
    example: `## Chapters
### 00:00:00 - Introduction and Overview
A comprehensive introduction providing readers with the main themes and concepts explored throughout the chapter. The content highlights significant points discussed in detail and explores their broader implications and practical relevance.
Connections are made between concepts, emphasizing interrelationships and potential impacts on various fields or current challenges. The chapter sets a clear foundation for understanding the subsequent discussions.`
  }
}