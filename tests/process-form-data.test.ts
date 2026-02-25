import { describe, expect, test } from "bun:test"
import { parseProcessingFormData } from "~/routes/api/process/form-helpers/parse-form-data"

describe("parseProcessingFormData", () => {
  test("ignores empty optional music advanced fields", () => {
    const formData = new FormData()
    formData.append("url", "https://example.com/watch?v=abc")
    formData.append("transcriptionOption", "groq")
    formData.append("transcriptionModel", "whisper-large-v3-turbo")
    formData.append("llmService", "groq")
    formData.append("llmModel", "openai/gpt-oss-20b")
    formData.append("selectedPrompts", "shortSummary")
    formData.append("musicSampleRate", "")
    formData.append("musicBitrate", "")

    const result = parseProcessingFormData(formData)

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.output.musicSampleRate).toBeUndefined()
    expect(result.output.musicBitrate).toBeUndefined()
  })
})
