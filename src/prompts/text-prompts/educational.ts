import type { PromptType, PromptConfig } from '~/types'

export const EDUCATIONAL: Partial<Record<PromptType, PromptConfig>> = {
  courseCurriculum: {
    title: "Course Curriculum",
    displayTitle: "Course Curriculum",
    category: "Educational",
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
  }
}
