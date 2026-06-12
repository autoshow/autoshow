# Models and Configuration Overview

This section documents the current model registry under `src/models/models-config/*.ts`. It intentionally reflects configured capabilities, defaults, and form fields, not historical benchmark rankings.

## Outline

- [Documentation Index](#documentation-index)
- [Current Defaults](#current-defaults)
- [Environment Variables Summary](#environment-variables-summary)
- [Canonical Selection Example](#canonical-selection-example)
- [Security Baseline for Model Execution](#security-baseline-for-model-execution)

## Documentation Index

- [02. Transcription Models](./02-transcription-models.md)
- [03. Document Extraction Models](./03-document-models.md)
- [04. LLM Models](./04-llm-models.md)
- [05. TTS Models](./05-tts-models.md)
- [06. Image Models](./06-image-models.md)
- [07. Music Models](./07-music-models.md)
- [08. Video Models](./08-video-models.md)

## Current Defaults

These are the registry defaults returned by helpers in `src/models/` unless otherwise noted:

| Modality | Default Selection |
|----------|-------------------|
| Document extraction | `mistral-ocr` + `mistral-ocr-latest` |
| LLM helper default | `openai` + `gpt-5.4-pro` |
| Whisper transcription | `groq` + `whisper-large-v3-turbo` |
| Streaming transcription | `happyscribe` + `happyscribe-auto` |
| Music | `elevenlabs` + `music_v1` |
| Video | `runway` + `gen4.5` + `1280x720` + `8s` |

The create flow preselects `groq` + `openai/gpt-oss-20b` for Step 3 as a lower-cost starting point, but LLM generation still starts disabled until the user enables it.

## Environment Variables Summary

| Service | Variable | Used For |
|---------|----------|----------|
| OpenAI | `OPENAI_API_KEY` | Document extraction, LLM, TTS, image |
| Anthropic | `ANTHROPIC_API_KEY` | Document extraction, LLM |
| Google Gemini | `GEMINI_API_KEY` | Document extraction, LLM, TTS, image, video |
| xAI | `XAI_API_KEY` | Document extraction, LLM, TTS, image, video |
| Groq | `GROQ_API_KEY` | Transcription, LLM, TTS |
| ElevenLabs | `ELEVENLABS_API_KEY` | TTS, music |
| AssemblyAI | `ASSEMBLYAI_API_KEY` | Transcription |
| Deepgram | `DEEPGRAM_API_KEY` | Transcription, TTS |
| Gladia | `GLADIA_API_KEY` | Transcription |
| YouTube Captions | No provider key required; optional `YOUTUBE_API_KEY` for metadata | Transcription |
| HappyScribe | `HAPPYSCRIBE_ORGANIZATION_ID`, `HAPPYSCRIBE_API_KEY` | Transcription |
| Soniox | `SONIOX_API_KEY` | Transcription |
| Supadata | `SUPADATA_API_KEY` | Transcription |
| deAPI | `DEAPI_API_KEY` | Transcription, document extraction, TTS, image, music, video |
| DeepInfra | `DEEPINFRA_API_KEY` | Transcription, LLM, image, video |
| Mistral | `MISTRAL_API_KEY` | Document extraction |
| MiniMax | `MINIMAX_API_KEY` | LLM, image, music, video |
| Runway | `RUNWAYML_API_SECRET` | TTS, image, video |
| BFL / Flux | `BFL_API_KEY` | Image |
| GLM / Z.AI | `GLM_API_KEY` | Document extraction, LLM, image, video |
| Database | `DATABASE_URL` | SQLite data store |

## Canonical Selection Example

The model registry is ultimately consumed by [`POST /api/process`](../api/process.md). A minimal uploaded-audio request looks like this:

```bash
curl -X POST http://localhost:4321/api/process \
  -F "uploadId=upload_1700654321000_4d8f4c8b-19ae-4c84-9f3a-b52d6a5d2d66" \
  -F "transcriptionOption=groq" \
  -F "transcriptionModel=whisper-large-v3-turbo" \
  -F "llmEnabled=true" \
  -F "llmService=groq" \
  -F "llmModel=openai/gpt-oss-20b" \
  -F "selectedPrompts=shortSummary" \
  -F "ttsEnabled=false" \
  -F "imageGenEnabled=false" \
  -F "musicGenEnabled=false" \
  -F "videoGenEnabled=false"
```

## Security Baseline for Model Execution

All model execution in production runs behind these controls:

- Local/global [`POST /api/process`](../api/process.md)
- Source URL validation against the public-network SSRF guard
- USD cost estimation before job creation
- Global access to job state and generated outputs
