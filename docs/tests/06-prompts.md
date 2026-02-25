# Prompt Benchmark Suite

Benchmarks every text prompt against the cheapest model from each LLM service with detailed metadata.

## Outline

- [Quick Start](#quick-start)
- [What It Tests](#what-it-tests)
  - [LLM Services](#llm-services-cheapest-models)
  - [Prompts Tested](#prompts-tested)
- [Test Configuration](#test-configuration)
- [Metadata Captured](#metadata-captured)
- [Output](#output)
  - [Console Summary](#console-summary)
  - [JSON Report](#json-report)
- [Timeouts](#timeouts)
- [Use Cases](#use-cases)
- [Running Subsets](#running-subsets)

## Quick Start

```bash
bun test tests/prompt-benchmark.test.ts
```

## What It Tests

The suite runs **228 tests** (6 LLM services × 38 prompts), testing each prompt individually against the cheapest model from each service.

### LLM Services (Cheapest Models)

| Service | Model                          | Input Cost | Output Cost |
|---------|--------------------------------|------------|-------------|
| Groq    | `openai/gpt-oss-20b`           | $0.075/M   | $0.30/M     |
| Grok    | `grok-4-1-fast-non-reasoning`  | $0.20/M    | $0.50/M     |
| Gemini  | `gemini-3-flash-preview`       | $0.50/M    | $3.00/M     |
| Claude  | `claude-haiku-4-5-20251001`    | $1.00/M    | $5.00/M     |
| MiniMax | `MiniMax-M2.1`                 | $0.30/M    | $1.20/M     |
| OpenAI  | `gpt-5.1`                      | $1.25/M    | $10.00/M    |

### Prompts Tested

| Category          | Prompts                                                                                                                |
|-------------------|------------------------------------------------------------------------------------------------------------------------|
| Overviews         | `bulletPoints`, `takeaways`, `faq`, `quotes`, `titles`                                                                 |
| Summaries         | `shortSummary`, `mediumSummary`, `longSummary`                                                                         |
| Chapters          | `shortChapters`, `mediumChapters`, `longChapters`                                                                      |
| Social Media      | `facebook`, `instagram`, `linkedin`, `tiktok`, `x`                                                                     |
| Creative Writing  | `poetryCollection`, `screenplay`, `shortStory`                                                                         |
| Marketing Content | `contentStrategy`, `emailNewsletter`, `seoArticle`, `pressRelease`                                                     |
| Business Analysis | `competitiveAnalysis`, `trendAnalysis`, `meetingActions`                                                               |
| Personal Growth   | `voiceReflection`, `goalSetting`, `careerPlan`, `progressAnalysis`                                                     |
| Educational       | `courseCurriculum`, `questions`, `assessmentGenerator`                                                                 |
| Learning          | `flashcards`, `howToGuide`, `studyGuide`, `trainingManual`, `troubleshootingGuide`                                     |

## Test Configuration

All tests use:
- **Input**: `tests/test-input-files/1.mp3` (1-minute audio)
- **Transcription**: Groq `whisper-large-v3-turbo`
- **Single prompt per test**: Each prompt runs in isolation

## Metadata Captured

For each test, the following metrics are captured:

| Metric            | Description                                          |
|-------------------|------------------------------------------------------|
| `inputTokens`     | Number of tokens in the prompt sent to the LLM       |
| `outputTokens`    | Number of tokens in the LLM response                 |
| `costUSD`         | Calculated cost based on token counts and model pricing |
| `executionTimeMs` | LLM processing time in milliseconds                  |
| `outputLength`    | Character count of the generated text output         |
| `timestamp`       | ISO timestamp when the test completed                |

## Output

### Console Summary

After all tests complete, a summary table is printed:

```
========================================================================================================================
PROMPT BENCHMARK RESULTS
========================================================================================================================
Service    | Model                          | Prompt             | Status   |   In Tok | Out Tok |   Cost ($) | Time (ms)
------------------------------------------------------------------------------------------------------------------------
groq       | openai/gpt-oss-20b             | shortSummary       | passed   |     2048 |      64 |   0.000173 |       892
groq       | openai/gpt-oss-20b             | longSummary        | passed   |     2048 |     256 |   0.000230 |      1205
...
========================================================================================================================
Total: 228 tests | Passed: 228 | Failed: 0
Total Cost: $0.042156 | Total LLM Time: 48291ms
========================================================================================================================
```

### JSON Report

A detailed JSON report is written to:

```
logs/{timestamp}-prompt-benchmark-report.json
```

Report structure:

```json
{
  "generatedAt": "2026-02-02T12:00:00.000Z",
  "testInputFile": "tests/test-input-files/1.mp3",
  "transcriptionService": "groq",
  "transcriptionModel": "whisper-large-v3-turbo",
  "totalTests": 150,
  "passed": 150,
  "failed": 0,
  "totalCostUSD": 0.042156,
  "totalExecutionTimeMs": 48291,
  "results": [
    {
      "service": "groq",
      "model": "openai/gpt-oss-20b",
      "prompt": "shortSummary",
      "status": "passed",
      "inputTokens": 2048,
      "outputTokens": 64,
      "costUSD": 0.000173,
      "executionTimeMs": 892,
      "outputLength": 156,
      "timestamp": "2026-02-02T12:00:05.000Z"
    }
  ]
}
```

## Timeouts

| Operation       | Timeout    |
|-----------------|------------|
| Server setup    | 10 minutes |
| Individual test | 5 minutes  |
| Job polling     | 5 minutes  |

## Use Cases

- **Compare prompt costs**: See which prompts are most expensive across services
- **Benchmark LLM speed**: Compare execution times between services for the same prompt
- **Token analysis**: Understand input/output token ratios for different prompt types
- **Cost estimation**: Use results to estimate costs for production workloads
- **Regression testing**: Detect changes in LLM behavior or pricing

## Running Subsets

To run tests for a specific service:

```bash
bun test tests/prompt-benchmark.test.ts --grep "groq"
bun test tests/prompt-benchmark.test.ts --grep "gemini"
bun test tests/prompt-benchmark.test.ts --grep "minimax"
```

To run tests for a specific prompt:

```bash
bun test tests/prompt-benchmark.test.ts --grep "shortSummary"
bun test tests/prompt-benchmark.test.ts --grep "Chapters"
```
