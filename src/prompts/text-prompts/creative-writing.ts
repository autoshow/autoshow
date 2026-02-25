import type { PromptType, PromptConfig } from '~/types'

export const CREATIVE_WRITING: Partial<Record<PromptType, PromptConfig>> = {
  poetryCollection: {
    title: "Poetry Collection",
    displayTitle: "Poetry Collection",
    category: "Creative Writing",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A themed poetry collection with 6-10 poems using various forms and literary devices'
    },
    llmInstruction: 'Generate "poetryCollection": a themed poetry collection with 6-10 poems using various forms (free verse, sonnets, haiku) exploring themes from the content.',
    markdownInstruction: `- Create themed poetry collection using various forms and literary devices.
  - Include free verse, structured forms, and experimental styles.
  - Explore emotions and metaphors related to core themes.
  - Create 6-10 poems that work individually and as cohesive collection.`,
    markdownExample: `## Poetry Collection: "[Thematic Title]"

### Poem 1: "Data Points" (Free Verse)
Numbers dance across the screen,
each digit a whisper of truth
we're not ready to hear.

Behind every percentage
lives a story—
forty-three percent growth
means Sarah worked until 3 AM,
coffee rings like halos
of dedication.

We measure everything
but miss the moments
between numbers
where life happens.

### Poem 2: "The Pivot" (Sonnet)
When markets shift like tectonic plates below,
And strategies once firm collapse,
The wisest leaders learn to bend and flow,
To bridge the ever-widening gaps.

In transformation's crucible we find
That adaptation serves the prepared mind.

### Poem 3: "Algorithm Dreams" (Haiku Series)
Patterns emerge bright—
Hidden in vast data streams,
Future takes its shape.

Code runs through the night,
Processing human choices—
Tomorrow's blueprint.

### Collection Notes
**Themes:** Human-data intersection, transformation, predictive analytics
**Techniques:** Metaphor, personification, visual poetry
**Journey:** Observation → struggle → empowerment`
  },
  screenplay: {
    title: "Screenplay",
    displayTitle: "Screenplay",
    category: "Creative Writing",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A screenplay format short film (15-20 pages) with scene structure and director notes'
    },
    llmInstruction: 'Generate "screenplay": a screenplay format short film with proper scene structure, action lines, dialogue, and director notes.',
    markdownInstruction: `- Convert content into screenplay format with proper scene structure.
  - Create dramatic scenes embodying key concepts through character interactions.
  - Include scene headings, action lines, and visual storytelling.
  - Structure as 15-20 page short film with director's notes.`,
    markdownExample: `## Screenplay: "[Title]"

**FADE IN:**

**INT. CORPORATE OFFICE - DAY**
SARAH MARTINEZ (30s), analytical, studies data visualizations on multiple monitors.

**SARAH**
(to herself)
That can't be right.

JAMES PARKER (20s) enters with coffee.

**JAMES**
Talking to yourself again?

**SARAH**
Look at this pattern. [Key theme] isn't theoretical anymore.

James moves closer, expression changing.

**JAMES**
How confident are you?

**SARAH**
Six different analyses. Same result.

**CUT TO:**

**INT. CONFERENCE ROOM - DAY**
Sarah presents to skeptical EXECUTIVES.

**CEO PATRICIA WONG**
You're asking us to abandon our two-year strategy.

**SARAH**
I'm asking you to adapt to reality.

She clicks to projection showing market changes.

**SARAH (CONT'D)**
We can lead this transformation or be left behind.

**FADE OUT.**

**Production Notes:** Office locations, data graphics, 15-minute runtime`
  },
  shortStory: {
    title: "Short Story",
    displayTitle: "Short Story",
    category: "Creative Writing",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A compelling short story (1,500-2,500 words) with three-act structure'
    },
    llmInstruction: 'Generate "shortStory": a compelling short story (1,500-2,500 words) with fictional characters, dialogue, and three-act structure incorporating core themes.',
    markdownInstruction: `- Transform content into a compelling short story with narrative structure.
  - Create fictional characters and dialogue incorporating core themes.
  - Include setting, character development, conflict, and resolution.
  - Use literary devices and maintain thematic relevance.
  - Target 1,500-2,500 words with three-act structure.`,
    markdownExample: `## Short Story: "[Creative Title]"

### Act I: Setup
Sarah Martinez stared at the data scrolling across her screen. As lead analyst, she had seen trends before, but nothing like this. The patterns emerging told a story that would change everything.

"The numbers don't lie," she whispered, adjusting her glasses. Her colleague James appeared with coffee and his usual grin. "Working late again?"

"James, you need to see this," Sarah said, turning her monitor. "Remember what we discussed about [key theme]? It's happening faster than predicted."

### Act II: Conflict
Over the next days, Sarah found herself caught between data-driven reality and human resistance to change. Her discovery revealed [incorporate insights], but convincing others proved challenging.

The Friday boardroom meeting would determine everything. "You can't just tell them their strategy is wrong," warned her mentor Dr. Chen. "Even with perfect data, people need time."

But time was what they didn't have.

### Act III: Resolution
The presentation went better than expected. "So our five-year plan is obsolete?" asked the CEO.

"I'm saying it's an opportunity—if we act on what the data tells us," Sarah replied.

Six months later, watching the transformed strategy unfold exactly as predicted, Sarah realized the most important discoveries happen when we listen to what evidence has been trying to tell us all along.

**Themes:** [List 3-4 core themes from content]`
  }
}
