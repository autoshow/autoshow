import { createTestSuite, loadTestDefinitions } from "./test-runner/runner"

const args = process.argv.slice(2)
const patterns = args.filter(arg => !arg.startsWith("--"))

if (patterns.length === 0) {
  const definitions = await loadTestDefinitions()
  createTestSuite("E2E: All Tests", definitions)
} else {
  const definitions = await loadTestDefinitions(patterns)
  createTestSuite(`E2E: Filtered Tests (${patterns.join(", ")})`, definitions)
}
