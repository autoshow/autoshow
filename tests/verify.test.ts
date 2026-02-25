import { createTestSuite, loadTestDefinitions } from "./test-runner/runner"

const definitions = await loadTestDefinitions(["verify"])
createTestSuite("E2E: Model Verification Suite", definitions)
