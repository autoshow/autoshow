import { createLLMTest } from "./llm-test-runner"
import { LLM_CONFIGS, TEST_SUITES } from "./test-configs"

const suite = TEST_SUITES["20min-direct"]!

export const createTests = LLM_CONFIGS.map((llm) =>
  createLLMTest({ llm, suite })
)
