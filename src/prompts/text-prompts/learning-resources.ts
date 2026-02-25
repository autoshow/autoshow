import type { PromptType, PromptConfig } from '~/types'

export const LEARNING_RESOURCES: Partial<Record<PromptType, PromptConfig>> = {
  flashcards: {
    title: "Flashcards",
    displayTitle: "Flashcards",
    category: "Learning Resources",
    renderType: 'faq',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The flashcard question' },
          answer: { type: 'string', description: 'The flashcard answer' }
        },
        required: ['question', 'answer'],
        additionalProperties: false
      },
      description: '15-25 flashcard question/answer pairs for memorization'
    },
    llmInstruction: 'Generate "flashcards": an array of 15-25 objects with "question" and "answer" fields covering key facts, terms, and concepts for memorization.',
    markdownInstruction: `- Extract 15-25 key facts, terms, concepts, and ideas from the transcript.
  - Format each as a question/answer pair suitable for flashcard study.
  - Focus on the most important information that should be memorized.
  - Include a mix of definition questions, concept explanations, and application questions.
  - Keep answers concise but complete.`,
    markdownExample: `## Flashcards

**Card 1**
Q: What is the primary function of X?
A: The primary function is to manage and coordinate Y processes.

**Card 2**
Q: Define the term "Z" as used in this context.
A: Z refers to the systematic approach to organizing data structures.

**Card 3**
Q: What are the three main benefits of implementing this system?
A: 1) Increased efficiency, 2) Better data management, 3) Reduced operational costs.

**Card 4**
Q: How does Process A differ from Process B?
A: Process A focuses on automation while Process B emphasizes manual oversight.`
  },
  howToGuide: {
    title: "How-To Guide",
    displayTitle: "How-To Guide",
    category: "Learning Resources",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A step-by-step how-to guide with prerequisites and numbered steps'
    },
    llmInstruction: 'Generate "howToGuide": a step-by-step how-to guide with overview, prerequisites, numbered steps, tips, warnings, and verification steps.',
    markdownInstruction: `- Convert instructional content into a clear, step-by-step how-to guide.
  - Break down complex processes into manageable, sequential steps.
  - Include prerequisites, tools needed, and expected outcomes.
  - Add warnings, tips, and troubleshooting notes where appropriate.
  - Use clear, action-oriented language and numbered steps.`,
    markdownExample: `## How-To Guide: [Process Name]

### Overview
Brief description of what this guide will help you accomplish and why it's useful.

### Prerequisites
- Required knowledge or skills
- Tools or software needed
- Estimated time to complete

### Step-by-Step Instructions

**Step 1: [Action]**
Detailed explanation of the first step with specific instructions.

*Tip:* Helpful advice to make this step easier or more effective.

**Step 2: [Action]**
Clear instructions for the second step, building on the previous step.

*Warning:* Important cautionary note about potential issues.

**Step 3: [Action]**
Continue with remaining steps in logical sequence.

### Verification
How to confirm that the process was completed successfully.

### Next Steps
What to do after completing this guide or related procedures to consider.`
  },
  studyGuide: {
    title: "Study Guide",
    displayTitle: "Study Guide",
    category: "Learning Resources",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A comprehensive study guide with key concepts, definitions, and review questions'
    },
    llmInstruction: 'Generate "studyGuide": a comprehensive study guide with key concepts, important definitions, main ideas summary, review questions, and practice exercises.',
    markdownInstruction: `- Create a comprehensive study guide based on the transcript content.
  - Organize information into clear sections with headings and subheadings.
  - Include key concepts, important definitions, and main ideas.
  - Add review questions and practice exercises where appropriate.
  - Structure the guide for effective learning and retention.`,
    markdownExample: `## Study Guide

### Key Concepts
**Concept 1:** Definition and explanation of the first major concept
**Concept 2:** Definition and explanation of the second major concept

### Important Definitions
- **Term 1:** Clear, concise definition
- **Term 2:** Clear, concise definition

### Main Ideas Summary
1. First main idea with supporting details
2. Second main idea with supporting details

### Review Questions
1. What are the key components of...?
2. How does X relate to Y?

### Practice Exercises
- Apply the concepts to real-world scenarios
- Identify examples in your own experience`
  },
  trainingManual: {
    title: "Training Manual",
    displayTitle: "Training Manual",
    category: "Learning Resources",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A step-by-step training manual with procedures, safety protocols, and checklists'
    },
    llmInstruction: 'Generate "trainingManual": a step-by-step training manual with objectives, safety requirements, procedures, troubleshooting, and assessment checkpoints.',
    markdownInstruction: `- Convert content into step-by-step training manual with procedures.
  - Include safety protocols, troubleshooting, and best practices.
  - Structure with clear sections, numbered steps, and visual callouts.
  - Add checklists, reference materials, and assessment checkpoints.`,
    markdownExample: `## Training Manual: [Process Name]

### Overview & Safety
**Objectives:** Complete standard procedures safely and effectively
**Duration:** [Time estimate]
**Prerequisites:** Previous training completion, safety certification

⚠️ **Safety Requirements:**
- Follow all safety protocols
- Never attempt without authorization
- Report concerns immediately

### Equipment & Prerequisites
**Required Equipment:** [List tools and materials]
**Checklist:**
□ Safety equipment verified
□ Work area prepared
□ Documentation available

### Core Procedures

#### Procedure 1: [Primary Process]
**Time:** 15-20 minutes

**Step 1: Setup (2-3 minutes)**
- Verify equipment operational
- Check safety systems
- Gather materials
✓ **Checkpoint:** Supervisor verification for first 3 attempts

**Step 2: Main Process (10-12 minutes)**
- Execute sequence: a) First action, b) Second action, c) Third action
💡 **Tip:** Common mistake to avoid
⚠️ **Caution:** Safety consideration

**Step 3: Verification (3-5 minutes)**
- Perform quality checks
- Complete documentation
✓ **Checkpoint:** Self-assessment required

### Troubleshooting
**Problem:** [Issue description]
**Symptoms:** Observable indicators
**Solution:** 1) Immediate action, 2) Secondary steps, 3) Escalation criteria

### Quick Reference
**Emergency Contacts:** [List]
**Key Reminders:** Safety frequency, documentation timing, quality standards

### Assessment
□ Demonstrate procedure under supervision
□ Pass knowledge check (80% minimum)
□ Supervisor competency sign-off`
  },
  troubleshootingGuide: {
    title: "Troubleshooting Guide",
    displayTitle: "Troubleshooting Guide",
    category: "Learning Resources",
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A troubleshooting guide with common issues, symptoms, and solutions'
    },
    llmInstruction: 'Generate "troubleshootingGuide": a troubleshooting guide with diagnostic checklist, common issues with symptoms/causes/solutions, and escalation criteria.',
    markdownInstruction: `- Extract problem-solving information and organize it into a troubleshooting format.
  - Identify common issues, symptoms, and solutions mentioned in the content.
  - Structure as problem/symptom/solution pairs with diagnostic steps.
  - Include both quick fixes and comprehensive solutions.
  - Add prevention tips where applicable.`,
    markdownExample: `## Troubleshooting Guide

### Quick Diagnostic Checklist
- [ ] First thing to check
- [ ] Second verification step
- [ ] Third diagnostic item

### Common Issues & Solutions

**Problem 1: [Specific Issue]**
*Symptoms:* What users will observe when this problem occurs
*Cause:* Why this problem typically happens
*Solution:*
1. First step to resolve
2. Second step if needed
3. Alternative approach if above doesn't work
*Prevention:* How to avoid this issue in the future

**Problem 2: [Another Issue]**
*Symptoms:* Observable signs of this problem
*Cause:* Root cause explanation
*Solution:*
1. Primary resolution steps
2. Secondary options
*Prevention:* Preventive measures

### Advanced Troubleshooting
For complex issues that require deeper investigation or technical expertise.

### When to Escalate
Clear criteria for when to seek additional help or escalate to technical support.`
  }
}
