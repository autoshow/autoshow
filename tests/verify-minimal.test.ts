import { createTestSuite, loadTestDefinitions } from "./test-runner/runner"

const definitions = await loadTestDefinitions(["minimal-service"])
createTestSuite("E2E: Minimal Service Verification Suite", definitions)
