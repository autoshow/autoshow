# Test Overview

Test infrastructure and fixtures for the Autoshow application.

## Outline

- [Directory Structure](#directory-structure)
- [Test Definition Format](#test-definition-format)
  - [Input Types](#input-types)
- [Available Services & Models](#available-services--models)
  - [Transcription Services](#transcription-services)
  - [LLM Models](#llm-models)
  - [Document Parsing](#document-parsing)
- [Required Environment Variables](#required-environment-variables)
- [Test Reports](#test-reports)

## Directory Structure

```
tests/
├── README.md
├── e2e.test.ts                # Run all tests or filter by tags
├── verify.test.ts             # Full model verification suite (37 tests)
├── verify-minimal.test.ts     # Minimal service verification (21 tests)
├── verify-base.test.ts        # Cost-targeted verification base suite (8 tests)
├── api/                       # API endpoint tests
│   └── health.test.ts         # Health check endpoint test
├── paths.test.ts              # URL path tests
├── test-runner/               # Test execution infrastructure
│   ├── api.ts                 # API utilities (upload, submit, poll)
│   ├── container.ts           # Server setup/teardown
│   └── runner.ts              # Test runner that loads JSON definitions
├── test-definitions/          # JSON test definition files
│   ├── verify/                # Verification tests (37 files)
│   ├── verify-base/           # Verify base tests (8 files)
│   ├── transcription/         # Transcription tests (14 base files)
│   ├── llm/                   # LLM tests (10 base files)
│   ├── document/              # Document parsing tests (5 base files)
│   ├── tts/                   # TTS tests
│   ├── music/                 # Music generation tests
│   ├── image/                 # Image generation tests
│   ├── video/                 # Video generation tests
│   └── structured/            # Structured output tests
└── test-input-files/          # Test fixture files
    ├── 1.mp3                  # 1-minute audio
    ├── 5.mp3                  # 5-minute audio
    ├── 1.pdf                  # 1-page PDF document
    └── 3.pdf                  # 3-page PDF document
```

## Test Definition Format

Each test is defined as a JSON file with a consistent structure:

```json
{
  "id": "verify-llm-openai-gpt52",
  "name": "Verify: OpenAI GPT-5.2",
  "description": "Minimal verification test for OpenAI GPT-5.2 LLM",
  "tags": ["verify", "llm", "openai", "minimal"],
  "input": {
    "type": "local",
    "path": "tests/test-input-files/1.mp3"
  },
  "transcription": {
    "service": "groq",
    "model": "whisper-large-v3-turbo"
  },
  "llm": {
    "service": "openai",
    "model": "gpt-5.2",
    "prompts": ["shortSummary"]
  },
  "tts": { "enabled": false },
  "image": { "enabled": false },
  "music": { "enabled": false },
  "video": { "enabled": false },
}
```

### Input Types

| Type         | Fields                                       | Example                        |
|--------------|----------------------------------------------|--------------------------------|
| Local file   | `type: "local"`, `path`                      | `tests/test-input-files/1.mp3` |
| Direct URL   | `type: "url"`, `url`, `urlType: "direct-file"` | Audio/video URL                |
| Document URL | `type: "url"`, `url`, `urlType: "document"`  | PDF URL                        |

## Available Services & Models

### Transcription Services

| Service     | Model                                              | Notes                              |
|-------------|----------------------------------------------------|------------------------------------|
| Groq        | whisper-large-v3-turbo, whisper-large-v3           | Fast cloud transcription           |
| DeepInfra   | openai/whisper-large-v3-turbo, openai/whisper-large-v3 | Cheapest option                    |
| Fal         | fal-ai/whisper                                     | Speaker labels supported           |
| Gladia      | gladia-v2                                          | Speaker labels supported           |
| HappyScribe | happyscribe-auto                                   | Streaming service with auto-download |

### LLM Models

| Service | Models                                                                                                     |
|---------|------------------------------------------------------------------------------------------------------------|
| OpenAI  | gpt-5.1, gpt-5.2, gpt-5.2-pro, gpt-4o-mini                                                                 |
| Claude  | claude-sonnet-4-5-20250929, claude-opus-4-5-20251101, claude-haiku-4-5-20251001, claude-sonnet-4-20250514   |
| Gemini  | gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.0-flash                                             |
| MiniMax | MiniMax-M2.1, MiniMax-M2.1-lightning                                                                       |
| Groq    | openai/gpt-oss-20b, openai/gpt-oss-120b                                                                    |

### Document Parsing

| Service     | Models                                       |
|-------------|----------------------------------------------|
| LlamaParse  | fast, cost_effective, agentic, agentic_plus  |
| Mistral OCR | mistral-ocr-latest                           |

### TTS Services

| Service    | Voice                  | Model                         |
|------------|------------------------|-------------------------------|
| OpenAI     | alloy                  | gpt-4o-mini-tts               |
| ElevenLabs | JBFqnCBsd6RMkjVDRZzb   | eleven_flash_v2_5             |
| Groq       | autumn                 | canopylabs/orpheus-v1-english |

### Music Generation

| Service      | Genres               |
|--------------|----------------------|
| ElevenLabs   | rap, ambient, techno |
| Gemini Lyria | ambient, techno      |

### Image Generation

| Service | Models                                             |
|---------|----------------------------------------------------|
| OpenAI  | gpt-image-1, gpt-image-1-mini, gpt-image-1.5       |
| Gemini  | gemini-2.5-flash-image, gemini-3-pro-image-preview |
| MiniMax | image-01                                           |
| Grok    | grok-imagine-image                                 |

### Video Generation

| Service | Models                                              | Notes          |
|---------|-----------------------------------------------------|----------------|
| OpenAI  | sora-2, sora-2-pro                                  | $0.10-0.50/sec |
| Gemini  | veo-3.1-generate-preview, veo-3.1-fast-generate-preview | $0.35-0.40/sec |

## Required Environment Variables

Tests require API keys in your `.env` file:

| Category      | Required Keys                                                                                                |
|---------------|--------------------------------------------------------------------------------------------------------------|
| Transcription | `GROQ_API_KEY`, `DEEPINFRA_API_KEY`, `FAL_API_KEY`, `GLADIA_API_KEY`, `HAPPYSCRIBE_API_KEY` |
| LLM           | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `GROQ_API_KEY`, `MINIMAX_API_KEY`                 |
| Document      | `LLAMA_CLOUD_API_KEY`, `MISTRAL_API_KEY`                                                                     |
| TTS           | `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `GROQ_API_KEY`                                                       |
| Music         | `ELEVENLABS_API_KEY`, `GOOGLE_AI_API_KEY`                                                                    |
| Image         | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MINIMAX_API_KEY`, `XAI_API_KEY`                                         |
| Video         | `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`                                                                        |

## Test Reports

After running, reports are written to `logs/` in the project root:

- `logs/e2e-{suite-name}-report.json` - Full test results with timings

Example report structure:
```json
{
  "reportGeneratedAt": "2025-01-23T...",
  "environment": { "platform": "darwin", "bunVersion": "1.x.x" },
  "summary": { "totalTests": 35, "passed": 35, "failed": 0, "totalDurationMs": 123456 },
  "tests": [...]
}
```
