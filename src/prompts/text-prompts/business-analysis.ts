import type { PromptType, PromptConfig } from '~/types'

export const BUSINESS_ANALYSIS: Partial<Record<PromptType, PromptConfig>> = {
  competitiveAnalysis: {
    title: "Competitive Analysis",
    displayTitle: "Competitive Analysis Report",
    category: "Business Analysis",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A comprehensive competitive analysis with market positioning, SWOT analysis, and strategic recommendations'
    },
    llmInstruction: 'Generate "competitiveAnalysis": a comprehensive competitive analysis report identifying key competitors, market positioning, strengths/weaknesses/opportunities/threats, pricing strategies, product features, customer segments, market share analysis, competitive advantages, and strategic recommendations.',
    markdownInstruction: `- Create a comprehensive competitive analysis based on market information, strategies, and performance data mentioned in the content.
  - Identify key competitors and their market positioning.
  - Analyze strengths, weaknesses, opportunities, and threats for each competitor.
  - Compare pricing strategies, product features, and customer segments.
  - Include market share analysis and competitive advantages.
  - Provide strategic recommendations for competitive positioning.
  - Focus on actionable insights for decision-making.`,
    markdownExample: `## Competitive Analysis Report

### Executive Summary
Overview of the competitive landscape, key findings, and strategic implications for market positioning.

### Market Overview
**Market Size:** Current market valuation and growth projections
**Key Trends:** Major trends shaping competitive dynamics
**Market Segments:** Primary customer segments and their characteristics

### Competitor Profiles

#### Competitor 1: [Company Name]
**Market Position:** Industry leader/challenger/niche player
**Market Share:** X% of total market
**Founded:** Year established
**Revenue:** Annual revenue (if available)

**Strengths:**
- Strong brand recognition and customer loyalty
- Advanced technology infrastructure
- Extensive distribution network
- Strong financial position

**Weaknesses:**
- High pricing strategy limits market penetration
- Limited product innovation in recent years
- Weak presence in emerging markets
- Customer service challenges

**Product/Service Offerings:**
- Core product lineup and key features
- Pricing strategy and positioning
- Target customer segments
- Unique value propositions

**Marketing Strategy:**
- Primary marketing channels and messaging
- Digital presence and social media strategy
- Partnership and collaboration approach
- Brand positioning and differentiation

#### Competitor 2: [Company Name]
[Continue same structure for additional competitors]

### Competitive Matrix

| Factor               | Our Company | Competitor 1 | Competitor 2 | Competitor 3 |
|----------------------|-------------|--------------|--------------|--------------|
| Price Point          | $$          | $$$          | $            | $$           |
| Product Quality      | High        | High         | Medium       | High         |
| Market Share         | 15%         | 35%          | 20%          | 10%          |
| Customer Satisfaction| 4.2/5       | 4.5/5        | 3.8/5        | 4.1/5        |
| Innovation Rate      | High        | Medium       | High         | Low          |

### SWOT Analysis by Competitor

**Competitor 1 SWOT:**
- **Strengths:** Market leadership, brand recognition
- **Weaknesses:** High costs, slow innovation
- **Opportunities:** International expansion, new segments
- **Threats:** Disruptive technologies, price pressure

### Competitive Gaps & Opportunities

**Market Gaps Identified:**
1. Underserved customer segment in mid-market
2. Limited mobile-first solutions
3. Lack of integrated ecosystem approach
4. Weak presence in specific geographic regions

**Opportunity Assessment:**
- **High Impact/Low Competition:** Mid-market automation solutions
- **Medium Impact/Medium Competition:** Mobile platform expansion
- **High Impact/High Competition:** Enterprise segment growth

### Strategic Recommendations

**Immediate Actions (0-6 months):**
1. **Price Positioning:** Adjust pricing strategy to compete with Competitor 2's aggressive pricing
2. **Feature Parity:** Develop features to match Competitor 1's advanced capabilities
3. **Customer Retention:** Implement loyalty program to prevent churn to competitors

**Medium-term Strategy (6-18 months):**
1. **Product Innovation:** Invest in R&D to leapfrog current market leaders
2. **Market Expansion:** Enter underserved geographic markets before competitors
3. **Partnership Strategy:** Form strategic alliances to compete with larger players

**Long-term Positioning (18+ months):**
1. **Market Leadership:** Position for market leadership in emerging segments
2. **Ecosystem Development:** Build comprehensive platform to increase switching costs
3. **Innovation Leadership:** Establish thought leadership and technology advancement

### Competitive Monitoring Framework

**Key Metrics to Track:**
- Market share changes and customer acquisition rates
- Pricing adjustments and promotional strategies
- Product launches and feature updates
- Customer satisfaction and review scores
- Marketing campaign effectiveness and reach

**Monitoring Schedule:**
- **Weekly:** Social media presence and customer sentiment
- **Monthly:** Product updates and pricing changes
- **Quarterly:** Market share analysis and financial performance
- **Annually:** Strategic direction and major initiatives

### Risk Assessment

**High Risk Scenarios:**
- Major competitor acquisition or merger
- Disruptive technology introduction by challenger
- Significant price war in the industry

**Mitigation Strategies:**
- Diversify product portfolio to reduce dependency
- Maintain strong customer relationships and loyalty
- Build strategic reserves for competitive responses

### Conclusion

Summary of key competitive insights and recommended strategic focus areas for maintaining and improving market position.`
  },
  trendAnalysis: {
    title: "Trend Analysis",
    displayTitle: "Trend Analysis Report",
    category: "Business Analysis",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A trend analysis report identifying patterns, future predictions, and strategic implications'
    },
    llmInstruction: 'Generate "trendAnalysis": a comprehensive trend analysis report identifying trends, patterns, and future predictions with data points, statistics, trend indicators organized by categories, implications for stakeholders, forward-looking insights, potential scenarios, and actionable recommendations.',
    markdownInstruction: `- Analyze the transcript content to identify trends, patterns, and future predictions.
  - Extract data points, statistics, and trend indicators mentioned.
  - Organize findings into categories with supporting evidence.
  - Include implications for different stakeholders or industries.
  - Provide forward-looking insights and potential scenarios.
  - Focus on actionable intelligence and strategic implications.`,
    markdownExample: `## Trend Analysis Report

### Executive Summary
Overview of the key trends identified and their potential impact across industries.

### Current Trend Landscape

**Trend 1: [Trend Name]**
- **Evidence:** Specific data points and examples from the content
- **Timeline:** When this trend emerged and expected duration
- **Magnitude:** Scale and scope of impact
- **Drivers:** Key factors fueling this trend

**Trend 2: [Trend Name]**
- **Evidence:** Supporting data and real-world examples
- **Timeline:** Development trajectory and milestones
- **Magnitude:** Quantified impact where possible
- **Drivers:** Underlying forces and catalysts

### Cross-Trend Analysis
How identified trends interact with and influence each other.

### Industry Impact Assessment
- **Technology Sector:** Specific implications and opportunities
- **Financial Services:** Relevant impacts and considerations
- **Healthcare:** Sector-specific trend implications
- **Retail/Consumer:** Market and consumer behavior impacts

### Future Projections

**12-Month Outlook:**
Most likely developments and their probability

**3-Year Projection:**
Medium-term implications and potential disruptions

**Long-term Considerations:**
Strategic planning factors for 5+ year horizons

### Actionable Recommendations
1. **Immediate Actions:** Steps to take within 90 days
2. **Strategic Investments:** Medium-term resource allocation
3. **Monitoring Metrics:** KPIs to track trend progression
4. **Risk Mitigation:** Strategies to address potential downsides`
  },
  meetingActions: {
    title: "Meeting Action Items",
    displayTitle: "Meeting Action Items",
    category: "Business Analysis",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A structured list of action items with responsibilities and deadlines from meeting content'
    },
    llmInstruction: 'Generate "meetingActions": a structured list of action items extracted from meeting content including responsible parties, deadlines, priorities, concrete tasks, decisions made, and follow-up items.',
    markdownInstruction: `- Analyze the transcript for meeting content and extract clear, actionable items.
  - Identify who is responsible for each action (if mentioned).
  - Include deadlines or timeframes when specified.
  - Organize actions by priority or category if applicable.
  - Focus on concrete tasks, decisions made, and follow-up items.`,
    markdownExample: `## Meeting Action Items

### High Priority
1. **John Smith** - Complete market research analysis by Friday, March 15th
2. **Sarah Johnson** - Schedule follow-up meeting with client within 2 business days

### Medium Priority
3. **Team Lead** - Review and approve budget proposal by end of week
4. **Marketing Team** - Draft social media campaign outline for next quarterly review

### Low Priority
5. Schedule next team meeting for project status update
6. Circulate meeting notes to all stakeholders within 24 hours`
  }
}
