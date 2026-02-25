# Playwright Tests

Browser automation tests that verify the full UI workflow and generate performance reports.

## Outline

- [Goal](#goal)
- [Running Tests](#running-tests)
  - [Run All Playwright Tests](#run-all-playwright-tests)
  - [Run Specific Tests](#run-specific-tests)
  - [Run by Pattern](#run-by-pattern)
- [Output](#output)
- [Test Flow](#test-flow)
- [Test Results](#test-results)

## Goal

Automate form submission and generate performance report with:
- URL: https://ajc.pics/audio/fsjam-short.mp3
- Transcription: Groq Whisper Large v3 Turbo (default)
- Prompt: Short Summary only (default)
- LLM: Groq GPT OSS 20B
- Skip: TTS, Image, Music, Video

## Running Tests

### Run All Playwright Tests

```bash
bun play
```

### Run Specific Tests

```bash
bun play tests/playwright/transcription-groq-turbo.spec.ts tests/playwright/transcription-fal.spec.ts
```

### Run by Pattern

```bash
bun play tests/playwright/llm-*.spec.ts
bun play tests/playwright/transcription-*.spec.ts
```

### Run Single Test

```bash
bunx playwright test tests/playwright/groq-short-summary.spec.ts
```

## Output

Creates three files in `logs/`:

1. `TIMESTAMP-playwright-groq-short-summary-report.json` - JSON report with:
   - Environment info
   - Summary (passed/failed/duration)
   - Step timings (urlVerify, jobSubmission, download, transcription, llm, etc.)
   - Input configuration
   - Job details
   - Show note page info

2. `TIMESTAMP-playwright-groq-short-summary-server.log` - Server-side processing logs:
   - URL verification details
   - Form data received
   - Processing steps
   - Transcription timing
   - LLM timing
   - Job completion

3. `TIMESTAMP-playwright-groq-short-summary-poll.log` - Client-side poll logs

## Test Flow

1. Navigate to `/create`
2. Fill URL input and verify
3. Select LLM model (GPT OSS 20B)
4. Check skip boxes for TTS, Image, Music, Video
5. Submit form
6. Poll job API tracking step progress
7. Verify job completion
8. Fetch show note page
9. Fetch server logs via `/api/server-logs`
10. Write report and logs

## Test Results

Each test writes individual reports to `logs/` with JSON results, server logs, and poll logs.
