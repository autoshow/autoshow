import { createTestSuite, loadTestDefinitions } from "./test-runner/runner"

const pathsEnv = process.env.TEST_PATHS
if (!pathsEnv) {
  console.error("Usage: TEST_PATHS='path1.json path2.json' bun test tests/paths.test.ts")
  console.error("Example: TEST_PATHS='tests/test-definitions/verify/verify-transcription-fal.json tests/test-definitions/verify/verify-transcription-gladia.json' bun test tests/paths.test.ts")
  process.exit(1)
}

const paths = pathsEnv.split(/\s+/).filter(p => p.endsWith(".json"))

if (paths.length === 0) {
  console.error("No .json paths found in TEST_PATHS")
  process.exit(1)
}

const definitions = await loadTestDefinitions(paths)
createTestSuite(`E2E: Path Tests (${paths.length} files)`, definitions)
