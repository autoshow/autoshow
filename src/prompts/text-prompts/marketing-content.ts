import type { PromptType, PromptConfig } from '~/types'

export const MARKETING_CONTENT: Partial<Record<PromptType, PromptConfig>> = {
  contentStrategy: {
    title: "Content Strategy",
    displayTitle: "90-Day Content Calendar",
    category: "Marketing Content",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A comprehensive 30-60-90 day content calendar with formats, platforms, and strategies'
    },
    llmInstruction: 'Generate "contentStrategy": a comprehensive 90-day content calendar with weekly themes, daily content suggestions, formats, platforms, and cross-promotion strategies.',
    markdownInstruction: `- Create a comprehensive 30-60-90 day content calendar based on the themes and topics from the transcript.
  - Include content formats, publishing platforms, target keywords, and engagement strategies.
  - Organize by weekly themes with daily content suggestions.
  - Include content types: blog posts, social media, videos, podcasts, newsletters.
  - Add campaign tie-ins, seasonal relevance, and cross-platform promotion strategies.`,
    markdownExample: `## 90-Day Content Calendar

### Month 1: Foundation Building
**Theme:** Establishing Authority and Awareness
**Primary Goals:** Build audience, establish expertise, create foundational content

#### Week 1: Introduction & Overview
**Monday - Blog Post:** "The Complete Guide to [Main Topic]" (2,000 words)
- Target Keywords: [primary keyword], [secondary keyword]
- Social Promotion: LinkedIn article excerpt, Twitter thread
- Email Newsletter: Feature as main story

**Tuesday - Social Media:** Instagram carousel (5 slides)
- Topic: "5 Essential Facts About [Topic]"
- Cross-post: LinkedIn, Facebook
- Stories: Behind-the-scenes content creation

**Wednesday - Video Content:** YouTube explainer video (8-10 minutes)
- Topic: "[Topic] Explained for Beginners"
- Repurpose: Instagram Reels highlights, TikTok version
- Blog supporting post: Video transcript + additional resources

**Thursday - Podcast/Audio:** Expert interview or solo episode
- Topic: "Common Myths About [Topic] Debunked"
- Distribution: Spotify, Apple Podcasts, Google Podcasts
- Social clips: Audiogram highlights for Twitter/LinkedIn

**Friday - Newsletter:** Weekly roundup + exclusive insight
- Topic: "This Week in [Industry]: Key Takeaways"
- Include: Blog recap, upcoming content teaser
- CTA: Engage with social content, share feedback

#### Week 2-4: [Continue pattern with different themes]

### Month 2: Engagement & Community Building
**Theme:** Interactive Content and Community Development
**Primary Goals:** Increase engagement, build community, gather user-generated content

### Month 3: Conversion & Growth
**Theme:** Lead Generation and Conversion Optimization
**Primary Goals:** Convert audience to leads, launch premium content, scale successful formats

### Content Format Distribution
- **Blog Posts:** 8 per month (2 per week)
- **Social Media:** Daily across platforms
- **Video Content:** 4 per month (weekly)
- **Email Newsletter:** Weekly + 2 promotional
- **Podcast/Audio:** Bi-weekly

### Performance Tracking
- **Week 1-2:** Establish baselines
- **Week 3-4:** Optimize based on initial data
- **Monthly:** Review and adjust strategy
- **Quarterly:** Major strategic pivots if needed

### Seasonal Tie-ins
- Industry events and conferences
- Holiday content opportunities
- Trending topics and news cycles
- Product launch coordination`
  },
  emailNewsletter: {
    title: "Email Newsletter",
    displayTitle: "Email Newsletter",
    category: "Marketing Content",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A professional email newsletter (300-600 words) with subject line and sections'
    },
    llmInstruction: 'Generate "emailNewsletter": a professional email newsletter (300-600 words) with engaging subject line, preview text, clear sections, and call-to-action.',
    markdownInstruction: `- Transform the content into a professional email newsletter format.
  - Include an engaging subject line and preview text.
  - Structure with clear sections: header, main content, highlights, and call-to-action.
  - Use scannable formatting with headers, bullet points, and short paragraphs.
  - Include subscriber engagement elements like polls, questions, or social sharing.
  - Add a personal touch with conversational tone while maintaining professionalism.
  - Target 300-600 words for optimal email length.`,
    markdownExample: `## Email Newsletter

**Subject Line:** The web development trend that's changing everything 🚀
**Preview Text:** Plus: 3 skills every developer needs to master in 2025

---

### Hi [First Name],

Hope your week is off to a great start!

I've been diving deep into the latest web development trends, and there's one shift that's absolutely fascinating – and it might change how you approach your next project.

## 🎯 This Week's Focus: Full-Stack Evolution

The line between frontend and backend development is blurring faster than ever. Here's what caught my attention:

**The Big Shift:**
• JavaScript frameworks are becoming more powerful and full-featured
• Backend technologies are adopting frontend-inspired patterns
• Developers are expected to understand the entire stack

**What This Means for You:**
✅ Broader skill requirements but also more opportunities
✅ Higher demand for versatile developers
✅ Need for continuous learning and adaptation

## 📊 By the Numbers

Did you know that 68% of companies now prefer full-stack developers for senior positions? The landscape is definitely shifting.

## 🔥 Quick Wins This Week

1. **Pick one new technology** from the opposite side of your current expertise
2. **Build a small project** that combines frontend and backend elements
3. **Join a developer community** focused on full-stack development

## 💭 Let's Discuss

What's your biggest challenge in expanding your development skills? Hit reply and let me know – I read every response!

## 🎉 Community Spotlight

Shoutout to Sarah M. who landed her dream full-stack role after following our backend-to-frontend transition guide. Way to go, Sarah! 🎊

---

**Coming Next Week:** The top 5 tools every full-stack developer should master in 2025

Keep coding,
[Your Name]

P.S. Found this useful? Share it with a fellow developer who might benefit!

[Share on Twitter] [Forward to a Friend] [Join Our Community]

---
📧 You're receiving this because you subscribed to our developer newsletter
🔗 Update preferences | Unsubscribe`
  },
  seoArticle: {
    title: "SEO Article",
    displayTitle: "SEO-Optimized Article",
    category: "Marketing Content",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'An SEO-optimized article (1,500-2,500 words) with meta info and keyword strategy'
    },
    llmInstruction: 'Generate "seoArticle": an SEO-optimized article (1,500-2,500 words) with meta title, meta description, header structure, keyword integration, and FAQ section.',
    markdownInstruction: `- Transform the content into an SEO-optimized article with strategic keyword placement.
  - Include meta title (60 characters), meta description (155 characters), and H1-H6 header structure.
  - Add internal linking suggestions and keyword density recommendations.
  - Include featured snippet optimization and FAQ sections for voice search.
  - Target 1,500-2,500 words with natural keyword integration.
  - Provide alt text suggestions for images and schema markup recommendations.`,
    markdownExample: `## SEO-Optimized Article

### Meta Information
**Meta Title:** Primary Keyword - Secondary Keyword | Brand Name
**Meta Description:** Compelling 155-character description that includes primary keyword and clear value proposition for click-through.
**Primary Keyword:** [Main target keyword]
**Secondary Keywords:** [2-3 related keywords]
**Search Intent:** [Informational/Commercial/Transactional]

### Article Structure

# H1: Primary Keyword-Rich Headline That Matches Search Intent

## H2: Introduction - Hook the Reader and Include Primary Keyword

Opening paragraph that naturally incorporates the primary keyword within the first 100 words while addressing the user's search intent.

## H2: [Topic Section 1 with Secondary Keyword]

Content section that provides comprehensive information while naturally incorporating secondary keywords.

### H3: Specific Subtopic
Detailed explanation with supporting evidence and examples.

## H2: [Topic Section 2 with Long-tail Keywords]

Additional value-driven content that addresses related questions users might have.

## H2: Frequently Asked Questions

**Q: Common question related to primary keyword?**
A: Concise answer optimized for featured snippets.

### Internal Linking Opportunities
- Link to [Related Article 1] using anchor text: [keyword phrase]
- Link to [Related Article 2] using anchor text: [keyword phrase]

### Image Optimization
- Alt text: "Descriptive text including primary keyword"
- File name: primary-keyword-descriptive-name.jpg

### Schema Markup Recommendations
- Article schema for main content
- FAQ schema for question section
- Breadcrumb schema for navigation`
  },
  pressRelease: {
    title: "Press Release",
    displayTitle: "Press Release",
    category: "Marketing Content",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A professional press release with headline, dateline, quotes, and boilerplate'
    },
    llmInstruction: 'Generate "pressRelease": a professional press release format with compelling headlines, stakeholder quotes, newsworthy angles, and standard structure with dateline and boilerplate.',
    markdownInstruction: `- Transform the content into a professional press release format.
  - Create compelling headlines and subheadings.
  - Include relevant quotes from key stakeholders or experts.
  - Focus on newsworthy angles and broader industry implications.
  - Follow standard press release structure with dateline and boilerplate.
  - Emphasize the significance and impact of the information.`,
    markdownExample: `## Press Release

**Compelling Headline That Captures the News Value**
*Subheading that provides additional context and appeal*

**City, State – Date** – Opening paragraph that answers who, what, when, where, why in compelling terms that would interest media outlets.

Second paragraph that expands on the significance and provides more detailed information about the announcement or development.

"Quote from key executive or stakeholder that adds credibility and human interest to the story," said Name, Title, Organization.

Additional paragraphs with supporting details, context, and implications for the industry or market.

### About [Organization]
Brief boilerplate description of the organization and its mission.

### Media Contact
Contact information for press inquiries.`
  }
}
