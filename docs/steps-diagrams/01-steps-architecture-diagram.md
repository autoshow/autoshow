# Steps Architecture Diagram

End-to-end architecture for the current 4-stage processing pipeline rooted in `src/routes/api/process`.

## Outline

- [Source Dispatcher](#source-dispatcher)
- [Pipeline Diagram](#pipeline-diagram)
- [Service Inventories](#service-inventories)
- [Retry and Provider Notes](#retry-and-provider-notes)
- [Artifacts and Storage](#artifacts-and-storage)

## Source Dispatcher

`executeProcessingJob()` in `src/routes/api/process/01-dl-audio/process-job/execute-job.ts` calls `processAudioSource()` in `src/routes/api/process/01-dl-audio/process-job/execute-job.ts` for Step 1 source dispatch.

1. `inputType === "document"` -> `processDocument()`
2. `isLocalFile && localFilePath && localFileName` -> `processFile()`
3. `urlType === "direct-file" && useResilientDownload` -> `processDirectUrl()`
4. everything else -> `processVideo()`

## Pipeline Diagram

```text
User input
  -> Step 1: Source handling + output directory creation
     local file:
       - validate the upload
       - convert to dual audio outputs with ffmpeg
       - write source audio artifacts into artifacts/output/{showNoteId}
     direct file URL:
       - download the remote media file
       - convert to dual audio outputs with ffmpeg
       - write source audio artifacts into artifacts/output/{showNoteId}
     streaming URL:
       - extract remote metadata only
       - create artifacts/output/{showNoteId}
       - defer transcription to streaming-aware services in Step 2
     document:
       - read metadata
       - create artifacts/output/{showNoteId}
       - optionally back up the original file to S3-compatible storage

  -> Step 2: Transcription or document extraction
     audio/direct/local:
       - route to the selected audio transcription service
       - split audio longer than 30 minutes into 30-minute segments
       - combine segment output into transcription.txt
     streaming URL:
       - send the source URL to the selected streaming transcription service
       - write transcription.txt from the remote service output
     document:
       - route to the selected OCR or multimodal document extraction service
       - write extracted-content.md and transcription.txt

  -> Step 3: Write and TTS (optional)
     - build the full prompt from transcript + source metadata + selected prompt types
     - build a dynamic JSON schema from the selected prompt config
     - call the structured-output LLM with retry/fallback logic
     - write prompt.md and text-output.json
     - optionally read narratable fields from text-output.json
     - synthesize speech with the selected TTS provider
     - write speech.wav or speech.mp3

  -> Step 4: Image, video, and music (optional)
     - image uses title + transcription text + selected image prompt types
     - video generates scene prompts with the selected Step 3 LLM or aux fallback
     - music generates lyrics with the selected Step 3 LLM or aux fallback
     - render media in the order image -> video -> music

  -> Finalization
     - write metadata.json
     - compute final USD cost
     - create the show note and complete the job in one DB transaction
```

## Service Inventories

### Step 2 transcription and extraction

- Audio transcription services routed by `src/routes/api/process/02-run-transcribe/run-transcribe.ts`: Groq, OpenAI, Gemini, DeepInfra, Gladia, AssemblyAI, Deepgram, and Soniox.
- Streaming URL transcription services routed by `src/routes/api/process/01-dl-audio/video/process-video.ts`: YouTube Captions, HappyScribe, Gladia, deAPI, and Supadata.
- Document extraction services routed by `src/routes/api/process/01-dl-audio/document/process-document.ts` and `src/models/models-config/document-config.ts`: Mistral OCR, GLM OCR, OpenAI, Claude, Gemini, Grok, and deAPI.

### Steps 3-4 generation services

- Structured LLM providers in Step 3: OpenAI, Claude, Gemini, MiniMax, DeepInfra, Grok, Groq, and GLM.
- TTS providers in Step 3: OpenAI, ElevenLabs, Deepgram, Gemini, Grok, Groq, Runway, and deAPI.
- Image providers in Step 4: OpenAI, Gemini, MiniMax, Grok, Runway, DeepInfra, deAPI, Flux, and GLM.
- Music generators in Step 4: ElevenLabs, MiniMax, and deAPI.
- Video generators in Step 4: Gemini, DeepInfra, MiniMax, Grok, Runway, GLM, and deAPI.

## Retry and Provider Notes

- Step 3 structured output uses `runStructuredLLMWithRetry()` in `src/routes/api/process/03-write-and-tts/run-llm/run-llm.ts`.
- Retry behavior is per-provider retries plus cross-provider fallback until success, provider exhaustion, or the 5-minute retry timeout.
- Per provider, the first retry repeats the same model once; the next attempt uses an alternate model for that provider when one exists; after that the runner advances to the next provider.
- Cross-provider fallback order is `gemini -> openai -> claude -> minimax -> deepinfra -> grok -> groq -> glm`.
- Providers without configured API keys are skipped.
- OpenAI structured output uses `responses.create()` with `text.format` JSON schema output.
- Claude structured output uses direct Messages REST calls with `output_config.format`.
- Step 4 lyrics generation and scene-description generation reuse the structured LLM runners directly, but they select either the user-selected Step 3 LLM or `DEFAULT_AUX_LLM` rather than using the full Step 3 retry wrapper.

## Artifacts and Storage

- `src/utils/artifact-paths.ts` defines the output root as `artifacts/output/{showNoteId}`.
- `createOutputDirectory()` in `src/routes/api/process/01-dl-audio/processing-helpers.ts` creates that folder through `getShowNoteOutputDir(showNoteId)`.
- Document backup lives in `src/routes/api/process/01-dl-audio/backup-document.ts`, which uploads through `src/utils/s3-utils.ts` to any configured S3-compatible storage. Railway can be used as the endpoint, but it is not the only target.
- Generated media steps also use `uploadToS3()` from `src/utils/s3-utils.ts` when S3-compatible storage is configured.

Example output package:

```text
artifacts/output/{showNoteId}/
  metadata.json
  transcription.txt
  extracted-content.md                 # documents only
  prompt.md                            # step 3 when llmEnabled
  text-output.json                     # step 3 when llmEnabled
  audio.wav / audio.mp3                # shorthand for the source WAV/MP3 pair
  {showNoteId}-{source}.wav            # actual local/direct filename pattern
  {showNoteId}-{source}.mp3            # actual local/direct filename pattern
  speech.wav | speech.mp3              # step 3 when ttsEnabled
  music-lyrics-prompt.md               # step 4 when vocals are generated
  music-lyrics.txt                     # step 4 when vocals are generated
  video-scene-*.md                     # step 4
  video-scene-description-*.md         # step 4
  ...provider-specific image/music/video outputs...
```
