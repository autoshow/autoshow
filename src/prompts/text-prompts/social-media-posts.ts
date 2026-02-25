import type { PromptType, PromptConfig } from '~/types'

export const SOCIAL_MEDIA_POSTS: Partial<Record<PromptType, PromptConfig>> = {
  facebook: {
    title: "Facebook Post",
    displayTitle: "Facebook Social Post",
    category: "Social Media Posts",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'Engaging Facebook post (100-200 words)'
    },
    llmInstruction: 'Generate "facebook": an engaging Facebook post summarizing key themes, conversational and suitable for broad audiences (100-200 words).',
    markdownInstruction: `- Write an engaging Facebook post summarizing the key themes of the transcript.
  - Keep it conversational and suitable for broad audiences.
  - Posts should ideally be around 100-200 words.`,
    markdownExample: `## Facebook Social Post
Have you ever wondered how web applications have transformed over the last decade? In our latest episode, we explore this evolution, highlighting the rise of JavaScript frameworks, backend innovations, and future trends that every developer should watch. Tune in to learn more and stay updated!`
  },
  instagram: {
    title: "Instagram Post",
    displayTitle: "Instagram Social Post",
    category: "Social Media Posts",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'Instagram post with caption, hashtags, and emojis (125-150 words)'
    },
    llmInstruction: 'Generate "instagram": an engaging Instagram post with compelling caption, relevant hashtags and emojis, authentic tone, strategic line breaks (125-150 words).',
    markdownInstruction: `- Write an engaging Instagram post with a compelling caption that tells a story or shares insights.
  - Include relevant hashtags and emojis to increase engagement.
  - Keep the tone authentic and visually descriptive.
  - Aim for 125-150 words with strategic line breaks.`,
    markdownExample: `## Instagram Social Post
✨ Just dropped some serious knowledge about the future of web development!

From JavaScript frameworks to cloud technologies, the landscape is evolving faster than ever.

What caught my attention most? The shift toward full-stack thinking and how developers are becoming true problem solvers, not just code writers.

💭 What's your take on where the industry is heading?

#WebDevelopment #TechTrends #JavaScript #FullStack #DeveloperLife #Innovation #TechTalk`
  },
  linkedin: {
    title: "LinkedIn Post",
    displayTitle: "LinkedIn Social Post",
    category: "Social Media Posts",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'Professional LinkedIn post (150-300 words)'
    },
    llmInstruction: 'Generate "linkedin": a professional and insightful LinkedIn post highlighting key takeaways and actionable insights relevant to professionals (150-300 words).',
    markdownInstruction: `- Write a professional and insightful LinkedIn post based on the transcript.
  - Highlight key takeaways or actionable insights relevant to professionals.
  - Aim for 150-300 words.`,
    markdownExample: `## LinkedIn Social Post
Today's web developers need to master a blend of skills, from client-side frameworks to robust backend technologies. Our latest content explores how professionals can stay competitive by embracing new tools, adapting to market trends, and continuously learning. What steps are you taking to future-proof your career? Share your thoughts!`
  },
  tiktok: {
    title: "TikTok Post",
    displayTitle: "TikTok Social Post",
    category: "Social Media Posts",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'TikTok caption with hook and hashtags (100-150 characters)'
    },
    llmInstruction: 'Generate "tiktok": an engaging, trend-aware TikTok caption with attention-grabbing hook, trending hashtags, and calls to action (100-150 characters).',
    markdownInstruction: `- Write a TikTok caption that's engaging, trend-aware, and encourages interaction.
  - Use a hook that grabs attention in the first few words.
  - Include trending hashtags and calls to action.
  - Keep it concise but impactful, around 100-150 characters.`,
    markdownExample: `## TikTok Social Post
POV: You just learned the secret to modern web development 🤯

The game is changing faster than you think! Here's what every developer needs to know about the future of coding.

Which trend surprised you most? Tell me in the comments! 👇

#WebDev #TechTok #Programming #Developer #CodeLife #TechTrends #LearnOnTikTok`
  },
  x: {
    title: "X Post",
    displayTitle: "X Social Post",
    category: "Social Media Posts",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'Concise X/Twitter post (under 280 characters)'
    },
    llmInstruction: 'Generate "x": a concise, engaging social media post optimized for X (formerly Twitter), under 280 characters with hashtags if appropriate.',
    markdownInstruction: `- Write a concise, engaging social media post optimized for the platform X (formerly Twitter).
  - Keep the post under 280 characters.
  - Include hashtags if appropriate.`,
    markdownExample: `## X Social Post
Web development isn't just coding; it's shaping the future. Dive into the latest trends and stay ahead of the curve. #WebDev #JavaScript`
  }
}
