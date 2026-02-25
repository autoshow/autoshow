import { describe, expect, test } from "bun:test"
import { PROMPT_CONFIG } from "~/prompts/text-prompts/text-prompt-config"
import { buildStructuredPrompt } from "~/routes/api/process/03-select-prompts/build-prompt"

describe("buildStructuredPrompt", () => {
  test("includes instruction, formatting guidance, and example for configured prompts", () => {
    const promptKey = "screenplay" as const
    const config = PROMPT_CONFIG[promptKey]

    const prompt = buildStructuredPrompt(
      "Sample transcript content",
      { title: "Sample Title", url: "https://example.com/video" },
      [promptKey]
    )

    expect(prompt).toContain(`- "${promptKey}"`)
    expect(prompt).toContain(`<field name="${promptKey}">`)
    expect(prompt).toContain(config.llmInstruction)
    expect(prompt).toContain(config.markdownInstruction.trim())
    expect(prompt).toContain(config.markdownExample.trim())
  })

  test("includes dedicated guidance for text prompt", () => {
    const prompt = buildStructuredPrompt(
      "Sample transcript content",
      { title: "Sample Title", url: "https://example.com/video" },
      ["text"]
    )

    expect(prompt).toContain(`- "text"`)
    expect(prompt).toContain('<field name="text">')
    expect(prompt).toContain('Generate a "text" field containing your complete response.')
  })
})
