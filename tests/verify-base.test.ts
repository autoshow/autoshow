import { createTestSuite, loadTestDefinitions } from "./test-runner/runner"

const definitions = await loadTestDefinitions(["verify-base"])
createTestSuite("E2E: Verify Base Suite", definitions)
