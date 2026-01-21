export const PROMPT_METADATA: Record<string, { 
  title: string
  description: string
  speed: string
  quality: string
  category: string
}> = {
  shortSummary: {
    title: "Short Summary",
    description: "Generate a concise one-sentence description (approximately 180 characters)",
    speed: "Fast",
    quality: "Concise",
    category: "Summaries and Overviews"
  },
  longSummary: {
    title: "Long Summary", 
    description: "Generate a comprehensive one-paragraph summary (600-1200 characters)",
    speed: "Fast",
    quality: "Detailed",
    category: "Summaries and Overviews"
  },
  bulletPoints: {
    title: "Bullet Points",
    description: "Generate a bullet point list summarizing key topics and insights",
    speed: "Fast",
    quality: "Structured",
    category: "Summaries and Overviews"
  },
  takeaways: {
    title: "Key Takeaways",
    description: "Generate three essential takeaways listeners should remember",
    speed: "Fast",
    quality: "Focused",
    category: "Summaries and Overviews"
  },
  faq: {
    title: "FAQ",
    description: "Generate 5-10 frequently asked questions and answers covering major content",
    speed: "Medium",
    quality: "Interactive",
    category: "Summaries and Overviews"
  },
  shortChapters: {
    title: "Short Chapters",
    description: "Generate timestamped chapter titles with one-sentence descriptions",
    speed: "Medium",
    quality: "Quick Overview",
    category: "Chapters"
  },
  mediumChapters: {
    title: "Medium Chapters",
    description: "Generate timestamped chapters with paragraph descriptions (~50 words each)",
    speed: "Slower",
    quality: "Balanced",
    category: "Chapters"
  },
  longChapters: {
    title: "Long Chapters",
    description: "Generate comprehensive timestamped chapters with detailed descriptions (75+ words)",
    speed: "Slowest",
    quality: "Comprehensive",
    category: "Chapters"
  }
}