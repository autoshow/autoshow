import type { PromptConfig,PromptType } from '~/types'

export const EDUCATIONAL: Partial<Record<PromptType, PromptConfig>> = {
  courseCurriculum: {
    title: "Course Curriculum",
    displayTitle: "Course Curriculum",
    category: "Educational",
    inputTokens: 200,
    outputTokens: 1500,
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'A comprehensive multi-module curriculum with learning objectives and assessments'
    },
    llmInstruction: 'Generate "courseCurriculum": a comprehensive multi-module curriculum with learning objectives, module descriptions, time commitments, and assessment methods.',
    markdownInstruction: `- Structure content into comprehensive multi-module curriculum.
  - Include learning objectives, module descriptions, and assessment methods.
  - Design progressive skill building with hands-on activities.
  - Add time commitments, difficulty levels, and instructor guidelines.`,
    markdownExample: `## Course Curriculum: [Course Title]

### Course Overview
**Duration:** 8-10 weeks (40-50 hours)
**Level:** Beginner to Intermediate
**Prerequisites:** Basic [foundational knowledge]
**Format:** Self-paced with optional live sessions

### Learning Outcomes
Students will:
1. Master core concepts and principles
2. Apply knowledge to real-world problems
3. Analyze complex scenarios using frameworks
4. Create original solutions

### Module 1: Foundations (Week 1-2)
**Objectives:** Define terminology, understand context, identify principles
**Content:** Video lectures (3 hrs), readings (2 hrs), exercises (1 hr)
**Assessment:** Knowledge quiz (80% pass)

### Module 2: Core Concepts (Week 3-4)
**Objectives:** Apply principles, analyze case studies, develop critical thinking
**Content:** Lectures (4 hrs), case studies (3 hrs), workshop (2 hrs)
**Assessment:** Case study report (75% pass)

### Module 3-4: Advanced Applications
[Continue progression with increasing complexity]

Original project demonstrating course concepts with written report and presentation.

### Assessment Rubric
- Knowledge Retention: 30%
- Practical Application: 40%
- Critical Thinking: 20%
- Participation: 10%`
  },
  questions: {
    title: "Comprehension Questions",
    displayTitle: "Comprehension Questions",
    category: "Educational",
    inputTokens: 200,
    outputTokens: 600,
    renderType: 'numberedList',
    schema: {
      type: 'array',
      items: { type: 'string' },
      description: '10 comprehension questions (5 beginner, 5 expert level)'
    },
    llmInstruction: 'Generate "questions": an array of 10 comprehension questions. First 5 should be beginner level, last 5 should be expert level, covering all major sections.',
    markdownInstruction: `- Include a list of 10 questions to check the listeners' comprehension of the material.
  - Ensure questions cover all major sections of the content.
  - Ensure the questions are correct, emphasize the right things, and aren't redundant.
  - Do not say things like "the instructor describes" or "according to the lesson," assume that all the questions relate to the lesson told by the instructor.
  - The first five questions should be beginner level questions and the last five should be expert level questions.`,
    markdownExample: `## Questions to Check Comprehension

### Beginner Questions
1. What are the three main components of the modern web development stack?
2. How has the role of JavaScript evolved in web development over the past decade?
3. What are the key differences between React and Vue.js?
4. Why is server-side rendering beneficial for web applications?
5. What is the purpose of a RESTful API in full-stack development?

### Expert Questions
6. How does Node.js differ from traditional server-side languages like PHP or Python?
7. What are the main considerations when choosing a database for a web application?
8. How do containerization technologies like Docker impact web development and deployment?
9. What role does responsive design play in modern web development?
10. How can developers ensure the security of user data in web applications?`
  },
  assessmentGenerator: {
    title: "Assessment Generator",
    displayTitle: "Assessment Package",
    category: "Educational",
    inputTokens: 200,
    outputTokens: 1000,
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'Comprehensive assessments with multiple question types and answer keys'
    },
    llmInstruction: 'Generate "assessmentGenerator": a comprehensive assessment package with multiple choice, short answer, essay questions, answer keys, and scoring rubrics.',
    markdownInstruction: `- Create comprehensive assessments with multiple question types.
  - Include multiple choice, short answer, essay, and practical exercises.
  - Provide answer keys with explanations and scoring rubrics.
  - Design questions at various difficulty levels testing different skills.`,
    markdownExample: `## Assessment Package

### Quiz 1: Knowledge Check (20 minutes, 15 questions)

**Multiple Choice:**
1. Primary function of [concept]:
   a) Distractor option
   b) Another distractor
   c) Correct answer
   d) Final distractor
   **Answer:** C - Explanation of correct answer

**True/False:**
6. [Key statement]: True/False
   **Answer:** True - Clarification and common misconceptions

### Test 2: Applied Knowledge (45 minutes, 25 questions)

**Short Answer (3-5 sentences):**
1. Explain application of [concept] to [scenario]. Include three key steps.
   **Model Answer:** Students should identify: analysis, application, implementation
   **Scoring:** 4=Excellent, 3=Good, 2=Satisfactory, 1=Needs improvement

### Certification Exam: Mastery Assessment (90 minutes)

**Case Study Analysis:**
[Scenario paragraph]
Questions 25-30 based on scenario analysis

**Essay Question (20 minutes):**
Compare [concept A] and [concept B]. Include similarities, differences, use cases. Minimum 300 words.

**Practical Exercise:**
Using provided data, create [deliverable] following Module 4 methodology.

### Grading Scale
A (90-100%), B (80-89%), C (70-79%), F (<70%)`
  },
  literatureReview: {
    title: "Literature Review",
    displayTitle: "Literature Review",
    category: "Educational",
    inputTokens: 250,
    outputTokens: 3500,
    renderType: 'text',
    schema: {
      type: 'string',
      description: 'An academic literature review with theoretical frameworks, methodological synthesis, research gaps, future directions, and source-grounded APA-style references'
    },
    llmInstruction: 'Generate "literatureReview": an academic literature review with an introduction, thematic analysis, methodological synthesis, critical evaluation, research gaps, future directions, and APA-style references only for sources explicitly present in the transcript or document. Do not invent authors, years, titles, DOIs, or reference entries.',
    markdownInstruction: `- Create an academic literature review grounded only in the transcript or document content.
  - Structure the review with an introduction, thematic analysis, methodological synthesis, critical evaluation, research gaps, future directions, and references.
  - Synthesize theoretical frameworks, methodological approaches, and empirical findings when they are present in the source material.
  - Use formal academic language and source-grounded APA-style in-text citations only when the transcript or document explicitly provides enough source details.
  - Do not invent authors, years, titles, DOIs, publication venues, or reference entries.
  - If source metadata is incomplete, cite only the available details in prose and explain the limitation.
  - If no explicit source metadata is present, omit the References section entries and state that source details were not available in the provided material.`,
    markdownExample: `## Literature Review: [Research Topic]

### Introduction
Introduce the research area, scope of the review, and the source base available in the transcript or document. State any citation limitations if author, date, title, or publication details are not provided.

### Theoretical Frameworks
Synthesize named theories, models, or conceptual frameworks that are explicitly discussed in the source material. When the source gives enough metadata, use APA-style in-text citations such as ([Author], [Year]).

### Thematic Analysis
#### Theme 1: [Theme Name]
Compare findings, arguments, and points of agreement across the sources or speakers represented in the material.

#### Theme 2: [Theme Name]
Identify contrasting perspectives, unresolved questions, and areas of convergence supported by the provided content.

### Methodological Synthesis
Summarize research designs, samples, data sources, analytical methods, and limitations only when they are explicitly described.

### Critical Evaluation
Evaluate the strength of the evidence, consistency of findings, methodological constraints, and theoretical implications.

### Research Gaps
List underexplored populations, missing methods, limited replication, contradictory findings, or unanswered conceptual questions found in the material.

### Future Directions
Recommend future research directions based on the identified gaps, including possible methods, contexts, and theoretical extensions.

### References
Include APA-style references only for sources whose author, year, title, and publication details are explicitly present in the transcript or document. If those details are absent, write: Source metadata was not available in the provided material, so formal reference entries are omitted.`
  }
}
