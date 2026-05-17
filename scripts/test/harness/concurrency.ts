import type { TestExecutionContext } from '~/types'
import { resolveTestOutputPath } from './output'

function sanitizeArtifactSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'test'
}

function createTestRunId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function createTestExecutionContext(
  testId: string,
  originalDefinitionIndex: number
): TestExecutionContext {
  const testRunId = createTestRunId()
  const artifactPrefix = `${String(originalDefinitionIndex + 1).padStart(3, '0')}-${sanitizeArtifactSegment(testId)}`

  return {
    testRunId,
    requestHeaders: {},
    artifactDir: resolveTestOutputPath(testRunId),
    artifactPrefix,
    originalDefinitionIndex,
  }
}
