import type { PromptType, PromptConfig } from '~/types'

export const PERSONAL_GROWTH: Partial<Record<PromptType, PromptConfig>> = {
  voiceReflection: {
    title: "Voice Reflection",
    displayTitle: "Personal Reflection",
    category: "Personal Growth",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A thoughtful personal reflection identifying key themes, emotions, insights, and growth areas'
    },
    llmInstruction: 'Generate "voiceReflection": a thoughtful reflection analyzing personal voice notes identifying key themes, emotions, insights, patterns in thinking, concerns, aspirations, potential growth areas, with supportive and non-judgmental tone including immediate reflections and longer-term considerations.',
    markdownInstruction: `- Analyze personal voice notes or thoughts shared in the transcript.
  - Create a thoughtful reflection that identifies key themes, emotions, and insights.
  - Highlight patterns in thinking, concerns, or aspirations mentioned.
  - Provide gentle, constructive observations and potential areas for growth or action.
  - Maintain a supportive, non-judgmental tone throughout the analysis.
  - Include both immediate reflections and longer-term considerations.`,
    markdownExample: `## Personal Reflection

### Key Themes Identified
The main themes that emerged from your voice notes center around personal growth, career development, and work-life balance challenges.

### Emotional Patterns
There's a recurring sense of ambition mixed with uncertainty about next steps, which is completely natural during periods of transition.

### Insights and Observations
Your thoughts reveal a strong self-awareness and desire for meaningful progress. The concerns you've expressed about time management suggest you're taking on significant responsibilities.

### Potential Areas for Growth
Consider establishing clearer boundaries between work commitments and personal time. Your reflections indicate this could reduce stress and increase overall satisfaction.

### Moving Forward
The goals you've outlined are achievable with focused effort. Breaking them into smaller, actionable steps might help maintain momentum while reducing overwhelm.`
  },
  goalSetting: {
    title: "Goal Setting",
    displayTitle: "Goal Setting Plan",
    category: "Personal Growth",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A structured goal-setting framework with specific objectives, timelines, action steps, and success metrics'
    },
    llmInstruction: 'Generate "goalSetting": a structured goal-setting framework extracting goals, aspirations, and desired outcomes with specific measurable objectives, timelines, action steps, success metrics, potential obstacles, and strategies to overcome them.',
    markdownInstruction: `- Extract goals, aspirations, and desired outcomes mentioned in the content.
  - Create a structured goal-setting framework with specific, measurable objectives.
  - Include timelines, action steps, and success metrics.
  - Address potential obstacles and provide strategies to overcome them.
  - Focus on creating an actionable plan for personal development.`,
    markdownExample: `## Goal Setting Plan

### Primary Goals Identified
Based on your content, the following core objectives emerged:

**Goal 1: [Specific Objective]**
- **Timeline:** 3-6 months
- **Success Metrics:** Measurable outcomes
- **Action Steps:**
  1. Weekly milestone with specific tasks
  2. Monthly review and adjustment
  3. Resource allocation and skill development

**Goal 2: [Career/Skill Development]**
- **Timeline:** 6-12 months
- **Success Metrics:** Concrete achievements
- **Action Steps:**
  1. Immediate preparation phase
  2. Implementation and practice
  3. Evaluation and refinement

### Implementation Strategy
**Week 1-2:** Foundation building and initial momentum
**Month 1:** Establish routines and track early progress
**Quarterly:** Major milestone reviews and course corrections

### Potential Obstacles & Solutions
**Challenge:** Time management concerns
**Strategy:** Break larger goals into 15-minute daily actions

**Challenge:** Maintaining motivation during setbacks
**Strategy:** Create accountability system and celebrate small wins

### Success Tracking
Weekly check-ins, monthly progress reviews, quarterly deep assessments`
  },
  careerPlan: {
    title: "Career Plan",
    displayTitle: "Career Development Plan",
    category: "Personal Growth",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A comprehensive career development roadmap with short and long-term objectives, skill development, and pathways'
    },
    llmInstruction: 'Generate "careerPlan": a comprehensive career development roadmap analyzing current position and aspirations with short-term and long-term career objectives, specific milestones, skill development, networking, experience requirements, actionable steps, timeline for advancement, and multiple career pathways with contingency planning.',
    markdownInstruction: `- Create a comprehensive career development roadmap based on current position and aspirations.
  - Include short-term and long-term career objectives with specific milestones.
  - Address skill development, networking, and experience requirements.
  - Provide actionable steps and timeline for career advancement.
  - Consider multiple career pathways and contingency planning.`,
    markdownExample: `## Career Development Plan

### Current Position Analysis
**Role:** Current position and responsibilities
**Strengths:** Key competencies and achievements
**Growth Areas:** Skills and experiences needed for advancement

### Career Objectives
**Short-term (1-2 years):**
- Target position or responsibility level
- Specific achievements and milestones
- Skill development priorities

**Medium-term (3-5 years):**
- Leadership role aspirations
- Industry expertise goals
- Professional recognition targets

**Long-term (5+ years):**
- Executive or specialist positioning
- Industry influence and thought leadership
- Legacy and impact objectives

### Development Pathways
**Path 1: Management Track**
- Leadership skill development
- Team management experience
- Strategic thinking capabilities

**Path 2: Expert/Specialist Track**
- Deep technical expertise
- Industry recognition
- Consulting and advisory roles

### Action Plan
**Quarterly Objectives:**
Q1: Foundation building and skill assessment
Q2: First major project or responsibility expansion
Q3: Network expansion and industry engagement
Q4: Performance review and plan refinement

**Annual Milestones:**
Year 1: Establish expertise and expand responsibilities
Year 2: Leadership opportunities and external recognition
Year 3: Strategic role transition or specialization

### Risk Mitigation
**Industry Changes:** Stay current with trends and adapt skills
**Economic Factors:** Develop transferable skills and diverse experience
**Personal Circumstances:** Maintain flexibility and alternative pathways`
  },
  progressAnalysis: {
    title: "Progress Analysis",
    displayTitle: "Progress Analysis",
    category: "Personal Growth",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'An analysis of current progress toward goals with achievements, challenges, growth patterns, and adjustment recommendations'
    },
    llmInstruction: 'Generate "progressAnalysis": an analysis of current status and progress toward stated goals identifying achievements, challenges, areas of growth, patterns of behavior, decision-making, suggested adjustments to strategies and approaches with encouragement and realistic perspectives.',
    markdownInstruction: `- Analyze current status and progress toward stated goals or aspirations.
  - Identify achievements, challenges, and areas of growth from the content.
  - Provide insights on patterns of behavior and decision-making.
  - Suggest adjustments to strategies and approaches.
  - Offer encouragement while maintaining realistic perspectives.`,
    markdownExample: `## Progress Analysis

### Current Status Overview
Based on your reflections, you're making meaningful progress in several key areas while facing typical challenges that come with growth.

### Achievements Recognized
- **Consistency:** You've maintained commitment to [specific area] over [timeframe]
- **Learning:** Evidence of new skills and knowledge acquisition
- **Mindset:** Growing self-awareness and reflective thinking

### Challenge Areas
**Time Management:** Balancing multiple priorities continues to be a learning process
**Energy Allocation:** Some activities may be draining rather than energizing

### Growth Patterns Observed
You demonstrate strong analytical thinking and willingness to adapt strategies when something isn't working.

### Recommended Adjustments
1. **Prioritization:** Focus on 2-3 core objectives rather than spreading effort too thin
2. **Energy Management:** Identify peak performance times and schedule important tasks accordingly
3. **Support Systems:** Consider increasing accountability and mentorship resources

### Forward Momentum
Your trajectory shows consistent upward progress. The challenges you're facing are normal parts of development, not indicators of failure.`
  }
}
