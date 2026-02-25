# Models & Configuration Overview

Complete reference for all AI models, pricing, performance, and environment variables.

## Outline

- [Documentation Index](#documentation-index)
- [Environment Variables Summary](#environment-variables-summary)
- [Recommended Configurations](#recommended-configurations)
  - [Fastest](#fastest-65s-for-20-min-audio)
  - [Balanced](#balanced-70s-for-20-min-audio)
  - [Quality](#quality-78s-for-20-min-audio)
- [Adding a New Provider](#adding-a-new-provider)

---

## Documentation Index

### [02. Transcription Models](./02-transcription-models.md)
Audio transcription with speaker diarization (Step 2)

### [03. Document Extraction Models](./03-document-models.md)
OCR and document parsing services (Step 2)

### [04. LLM Models](./04-llm-models.md)
Large language models for content generation (Step 4)

### [05. TTS Models](./05-tts-models.md)
Text-to-speech services for audio narration (Step 5)

### [06. Image Generation Models](./06-image-models.md)
AI image generation for thumbnails and assets (Step 6)

### [07. Music Generation Models](./07-music-models.md)
AI music generation for audio content (Step 7)

### [08. Video Generation Models](./08-video-models.md)
AI video generation from prompts (Step 8)

---

## Environment Variables Summary

| Service     | Variable               | Used For                           |
|-------------|------------------------|------------------------------------|
| OpenAI      | `OPENAI_API_KEY`       | LLM (GPT-5.x), TTS, Image, Video   |
| Claude      | `ANTHROPIC_API_KEY`    | LLM (Claude 4.5 series)            |
| Google      | `GEMINI_API_KEY`       | LLM (Gemini 3), Image, Video       |
| Grok/xAI    | `XAI_API_KEY`          | LLM (Grok 4.1), Image, Video       |
| Groq        | `GROQ_API_KEY`         | Transcription (Whisper), LLM, TTS  |
| DeepInfra   | `DEEPINFRA_API_KEY`    | Transcription (Whisper)            |
| Fal         | `FAL_API_KEY`          | Transcription                      |
| AssemblyAI  | `ASSEMBLYAI_API_KEY`   | Transcription                      |
| Deepgram    | `DEEPGRAM_API_KEY`     | Transcription                      |
| Soniox      | `SONIOX_API_KEY`       | Transcription                      |
| Gladia      | `GLADIA_API_KEY`       | Transcription                      |
| ElevenLabs  | `ELEVENLABS_API_KEY`   | Transcription, TTS, Music          |
| Rev AI      | `REV_API_KEY`          | Transcription                      |
| HappyScribe | `HAPPYSCRIBE_API_KEY`  | Transcription                      |
| Mistral     | `MISTRAL_API_KEY`      | Document extraction                |
| LlamaParse  | `LLAMA_CLOUD_API_KEY`  | Document extraction                |
| MiniMax     | `MINIMAX_API_KEY`      | LLM, Image, Music, Video generation |

---

## Recommended Configurations

### Fastest (6.5s for 20-min audio)

- **Transcription:** Groq whisper-large-v3-turbo (0.28s/min)
- **LLM:** Groq gpt-oss-20b (0.92s)
- **Total core pipeline:** 6.5s

### Balanced (7.0s for 20-min audio)

- **Transcription:** Groq whisper-large-v3-turbo (0.28s/min)
- **LLM:** OpenAI gpt-5.2 (1.44s)
- **Total core pipeline:** 7.0s

### Quality (7.8s for 20-min audio)

- **Transcription:** Groq whisper-large-v3-turbo (0.28s/min)
- **LLM:** Claude claude-sonnet-4-5 (2.15s)
- **Total core pipeline:** 7.8s

### Most Cost-Effective

- **Transcription:** DeepInfra whisper-large-v3-turbo ($0.0002/min)
- **Document:** Mistral mistral-ocr-latest (fastest)
- **LLM:** Groq gpt-oss-20b ($0.18/1M tokens average)
- **TTS:** OpenAI gpt-4o-mini-tts ($0.015/min)
- **Image:** MiniMax image-01 ($0.0035/image)
- **Music:** ElevenLabs music_v1 ($0.80/min)
- **Video:** OpenAI sora-2 ($0.10/sec)

### Best Performance

- **Transcription:** Groq whisper-large-v3-turbo (0.28s/min for 10-min audio)
- **Document:** Mistral mistral-ocr-latest (1.55s)
- **LLM:** Groq gpt-oss-20b (0.92s)
- **TTS:** ElevenLabs eleven_turbo_v2_5
- **Image:** Google gemini-2.5-flash-image
- **Music:** ElevenLabs music_v1
- **Video:** Google veo-3.1-fast-generate-preview

---

## Adding a New Provider

Follow these steps to add a new provider to the system:

1. **Add provider type** to `src/types/services-types.ts`
2. **Add model configuration** to appropriate config file in `src/models/`:
   - Transcription: `src/models/transcription-config.ts`
   - Document: `src/models/document-config.ts`
   - LLM: `src/models/llm-config.ts`
   - TTS: `src/models/tts-config.ts`
   - Image: `src/models/image-config.ts`
   - Music: `src/models/music-config.ts`
   - Video: `src/models/video-config.ts`
3. **Create service implementation** in appropriate step directory:
   - Step 2 Transcription: `src/routes/api/process/02-run-transcribe/`
   - Step 2 Document: `src/routes/api/process/02-run-transcribe/`
   - Step 4 LLM: `src/routes/api/process/04-run-llm/`
   - Step 5 TTS: `src/routes/api/process/05-run-tts/`
   - Step 6 Image: `src/routes/api/process/06-run-image/`
   - Step 7 Music: `src/routes/api/process/07-run-music/`
   - Step 8 Video: `src/routes/api/process/08-run-video/`
4. **Update routing** in step's `index.ts` file
5. **Update database schema** in `src/database/db.ts` (CHECK constraints)
6. **Update types** in relevant step type file (e.g., `src/types/step-2-transcription-types.ts`)
7. **Add environment variable** to `.env.example` and `.github/docker-compose.yml`
8. **Update this documentation** with pricing, performance data, and model details
