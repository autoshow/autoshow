import { createE2ETest } from "./test-runner"
import { TRANSCRIPTION_SERVICES, TEST_SUITES } from "./test-configs"

const suite = TEST_SUITES["10min-direct"]!

export const createTests = TRANSCRIPTION_SERVICES.map((transcription) =>
  createE2ETest({ transcription, suite })
)
