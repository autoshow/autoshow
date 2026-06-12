# Retry Functionality

Retry, fallback, polling, and terminal failure behavior for the processing pipeline under `src/routes/api/process`.

## Outline

- [Overview](#overview)
- [Retry Matrix](#retry-matrix)
- [Service Fallback Orders](#service-fallback-orders)
- [Provider Polling](#provider-polling)
- [Recoverable Progress](#recoverable-progress)
- [Terminal Errors](#terminal-errors)

## Overview

```text
Processing job
  -> source handling
  -> transcription or document extraction
     - local/direct audio may retry and fall back within its transcription family
     - streaming URL services try the selected provider, YouTube Captions when applicable, then paid streaming fallbacks
     - document extraction retries the selected provider request
  -> write and TTS
     - structured LLM retries, alternate models, and cross-provider fallback
     - TTS retries and cross-provider fallback when enabled
  -> media
     - image retries and cross-provider fallback
     - video scene LLM runs selected/aux LLM, then each render retries and falls back
     - music lyrics LLM runs selected/aux LLM, then render retries and falls back
  -> finalization
     - create show note and complete job in one transaction
```

Fallback layers skip providers whose required API key is missing. Most retry wrappers retry a failed selected provider once before moving to the next provider, except LLM text generation, which can also try one alternate model for the same provider. Streaming URL transcription tries each provider in its fallback chain once and keeps each provider's own polling and timeout behavior.

## Retry Matrix

| Area | Code Path | Retry Behavior | Timeout |
|---|---|---|---:|
| Local/direct transcription | `runTranscriptionWithRetry()` | same service twice, then family fallback | 5 min |
| Streaming transcription | `runStreamingTranscriptionWithFallback()` | selected provider, YouTube Captions for YouTube-host URLs, then paid streaming fallback | provider-specific |
| YouTube Captions | `transcribeWithYouTubeCaptions()` | selected caption track only | command/provider-specific |
| Document extraction | `runDocumentRequestWithRetries()` | selected provider request up to 3 attempts | none shared |
| Mistral OCR | `runMistralOCR()` | retryable HTTP statuses up to 3 attempts | none shared |
| LLM write | `runStructuredLLMWithRetry()` | same model, same model retry, alternate model, then next provider | 5 min |
| TTS | `runTTSWithRetry()` | same provider twice, then next provider | 3 min |
| Image | `processImageGeneration()` | same provider twice, then next provider | 5 min |
| Music render | `generateMusicTrack()` | same provider twice, then next provider | 10 min |
| Video render | `generateVideos()` | same provider twice per video prompt, then next provider | 10 min per prompt |

Document extraction does not cross-fall back to another document provider.

## Service Fallback Orders

### Transcription

```text
Whisper family:
  groq -> deepinfra

Diarization family:
  deepgram -> assembly -> gladia -> soniox

Streaming URL services:
  selected provider
  -> youtube (YouTube-host URLs only)
  -> happyscribe -> gladia -> deapi -> supadata
```

The selected streaming provider keeps the user-selected model. Later fallback providers use their default transcription model. The YouTube Captions runner confirms caption availability by resolving and downloading the selected caption track; if captions are missing or empty, the chain continues to paid providers.

API-key checks:

- `groq` -> `GROQ_API_KEY`
- `deepinfra` -> `DEEPINFRA_API_KEY`
- `deepgram` -> `DEEPGRAM_API_KEY`
- `assembly` -> `ASSEMBLYAI_API_KEY`
- `gladia` -> `GLADIA_API_KEY`
- `soniox` -> `SONIOX_API_KEY`
- `happyscribe` -> `HAPPYSCRIBE_API_KEY`, `HAPPYSCRIBE_ORGANIZATION_ID`
- `deapi` -> `DEAPI_API_KEY`
- `supadata` -> `SUPADATA_API_KEY`

### LLM

```text
gemini -> openai -> claude -> minimax -> deepinfra -> grok -> groq -> glm
```

Each provider is tried with the selected/default model, retried once, then retried with the first alternate configured model when one exists. The runner then advances to the next keyed provider.

API-key checks:

- `gemini` -> `GEMINI_API_KEY`
- `openai` -> `OPENAI_API_KEY`
- `claude` -> `ANTHROPIC_API_KEY`
- `minimax` -> `MINIMAX_API_KEY`
- `deepinfra` -> `DEEPINFRA_API_KEY`
- `grok` -> `XAI_API_KEY`
- `groq` -> `GROQ_API_KEY`
- `glm` -> `GLM_API_KEY`

### TTS

```text
gemini -> openai -> groq -> deepgram -> elevenlabs -> grok -> runway -> deapi
```

When a fallback service is selected, the runner switches to that service's default model and default voice.

### Image

```text
gemini -> openai -> minimax -> grok -> deepinfra -> flux -> glm -> runway -> deapi
```

When a fallback service is selected, the runner switches to that service's default image model and first configured dimension or aspect ratio.

### Music

```text
elevenlabs -> minimax -> deapi
```

Lyrics generation uses the user-selected LLM when Step 3 LLM is enabled; otherwise it uses `DEFAULT_AUX_LLM`. The lyrics LLM call is direct and does not use the full Step 3 LLM retry wrapper.

### Video

```text
gemini -> minimax -> runway -> grok -> deepinfra -> glm -> deapi
```

Scene-description generation uses the user-selected LLM when Step 3 LLM is enabled; otherwise it uses `DEFAULT_AUX_LLM`. The scene LLM call is direct and does not use the full Step 3 LLM retry wrapper. Render fallback switches to the next provider's default model, default size, nearest supported duration, and clears provider-specific aspect ratio.

## Provider Polling

```text
Create provider job
  -> poll status endpoint
     done/succeeded/completed -> download or parse result
     failed/error/canceled    -> throw terminal provider error
     pending/running          -> sleep and update progress
  -> max attempts exhausted   -> throw timeout error
```

Notable polling limits:

| Provider Path | Polling Limit |
|---|---:|
| HappyScribe transcription | 600 attempts, 10s interval, 100 min |
| HappyScribe export | 60 attempts, 2s interval, 2 min |
| Gladia transcription | 600 attempts, 5s interval, 50 min |
| Supadata transcription | 600 attempts, 5s interval, 50 min |
| deAPI transcription/document | 600 attempts, 5s interval, 50 min |
| AssemblyAI transcription | 20 min, interval grows from 3s to 30s |
| Soniox transcription | 20 min, interval grows from 3s to 30s |
| deAPI shared TTS/image/music/video jobs | 360 attempts, 5s interval, 30 min |
| Runway TTS | 120 attempts, 5s interval, 10 min |
| Runway image | 120 attempts, 5s interval, 10 min |
| Flux image | 120 attempts, 500ms interval |
| Video services using `video-helpers.ts` | 120 attempts, 5s interval, 10 min |

Provider polling errors are not hidden. Terminal provider states and polling timeouts throw into the retry wrapper when one exists, or fail the selected provider path directly when there is no shared wrapper.

## Recoverable Progress

`createRecoverableAttemptProgressTracker()` wraps retries for transcription, LLM, TTS, and image generation. When a provider runner reports an error during a recoverable attempt, the wrapper keeps the job in `processing` and replaces the error status with a fallback message:

```text
provider attempt reports error
  -> recoverable wrapper restores last progress
  -> message becomes "Trying another ... provider"
  -> retry loop records the error and tries again or falls back
```

The persisted job is only failed when the retry wrapper exhausts all attempts, times out, or the outer job handler catches an uncaught error. This prevents transient provider errors from briefly marking the job terminal while a fallback is still available.

## Terminal Errors

`executeProcessingJob()` is the terminal job boundary:

```text
try
  run secured pipeline
  finalize show note + final cost + complete job
catch
  log error
  failJob(jobId, error message)
  rethrow
```

Terminal failures include:

- no compatible fallback provider with a configured API key
- retry timeout exceeded
- all provider attempts failed
- no streaming fallback provider succeeds
- missing YouTube captions or empty caption track when no later fallback succeeds
- selected document extraction failure after its retries
- provider polling timeout or terminal provider failure state
- finalization failures while creating the show note or completing the job

Successful finalization runs `createShowNote()` and `completeJob()` inside one immediate database transaction. If that transaction fails, the job is failed and no partial successful job state is reported.
