# Autoshow Architecture Diagrams

## Detailed Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                              USER INPUT                                      |
|  +--------------+   +--------------+   +--------------+                     |
|  | Local File   |   |  Direct URL  |   | Streaming URL|                     |
|  | (.mp3/.mp4)  |   | (.mp3/.wav)  |   |  (YouTube)   |                     |
|  +------+-------+   +------+-------+   +------+-------+                     |
+---------+------------------+------------------+---------------------------------+
          |                  |                  |
          v                  v                  v
+-----------------------------------------------------------------------------+
|                        STEP 1: DOWNLOAD & AUDIO EXTRACTION                  |
|  +----------------------------------------------------------------------+  |
|  | Route Selection                                                       |  |
|  |  - Local: processFile() -> ffmpeg conversion                         |  |
|  |  - Direct URL: processDirectUrl() -> curl download                   |  |
|  |  - Streaming: processVideo() -> HappyScribe direct processing        |  |
|  +----------------------------------------------------------------------+  |
|  +----------------------------------------------------------------------+  |
|  | Audio Conversion Pipeline (Local/Direct only)                         |  |
|  |  Input (any format) -> ffmpeg -> 16kHz mono PCM WAV                  |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  OUTPUT: audio.wav + metadata.json (local/direct only)                      |
|          {title, author, duration, fileSize, timestamp}                     |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                        STEP 2: TRANSCRIPTION                                |
|  +----------------------------------------------------------------------+  |
|  | Service Selection Logic                                               |  |
|  |  - Local files -> Groq Whisper (required)                            |  |
|  |  - Direct URL -> Groq Whisper (downloads first, then transcribes)    |  |
|  |  - Streaming URL -> HappyScribe (required, processes URL directly)   |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  +-------------------------+     +-------------------------+                |
|  |   GROQ WHISPER          |     |   HAPPYSCRIBE           |                |
|  |                         |     |                         |                |
|  | - Audio segmentation    |     | - Direct URL support    |                |
|  |   (>10 min -> chunks)   |     | - Speaker diarization   |                |
|  | - Time offset tracking  |     | - Job polling           |                |
|  | - Models:               |     | - Export pipeline       |                |
|  |   - whisper-large-v3-   |     | - ~35 word segments     |                |
|  |     turbo (default)     |     | - Speaker labels        |                |
|  |   - whisper-large-v3    |     |                         |                |
|  |   - distil-whisper      |     |                         |                |
|  +-------------------------+     +-------------------------+                |
|                                                                              |
|  OUTPUT: transcription.txt                                                  |
|          [00:00:05] First segment text                                      |
|          [00:00:15] [Speaker 1] Second segment (HappyScribe)                |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                    STEP 3: CONTENT SELECTION (CONFIG)                       |
|  +----------------------------------------------------------------------+  |
|  | User Interface: Multi-Select Checkboxes                               |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  +-------------------------+     +-------------------------+                |
|  |   SUMMARIES             |     |   CHAPTERS              |                |
|  |   [ ] Short Summary     |     |   [ ] Short Chapters    |                |
|  |   [ ] Long Summary      |     |   [ ] Medium Chapters   |                |
|  |   [ ] Bullet Points     |     |   [ ] Long Chapters     |                |
|  |   [ ] Takeaways         |     |                         |                |
|  |   [ ] FAQ               |     |                         |                |
|  +-------------------------+     +-------------------------+                |
|                                                                              |
|  +----------------------------------------------------------------------+  |
|  | Prompt Assembly Engine                                                |  |
|  |  1. Base instructions (quality guidelines)                            |  |
|  |  2. Selected content instructions (from PROMPT_SECTIONS)              |  |
|  |  3. Format examples (structured templates)                            |  |
|  |  4. Video metadata injection                                          |  |
|  |  5. Complete transcript injection                                     |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  OUTPUT: Configuration array ['shortSummary', 'shortChapters']              |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                    STEP 4: LLM TEXT GENERATION                              |
|  +----------------------------------------------------------------------+  |
|  | Model Selection: User-configured OpenAI model                         |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  +----------------------------------------------------------------------+  |
|  | OpenAI API Request Flow                                               |  |
|  |                                                                        |  |
|  |  Assembled Prompt                                                     |  |
|  |       |                                                               |  |
|  |  Token Counting (word-based approximation)                            |  |
|  |       |                                                               |  |
|  |  API Call (30-minute timeout with AbortController)                    |  |
|  |       |                                                               |  |
|  |  Response Validation                                                  |  |
|  |       |                                                               |  |
|  |  File Persistence                                                     |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  OUTPUT: prompt.md (audit trail) + summary.md (generated content)           |
|          Metadata: {service, model, inputTokens, outputTokens, time}        |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                  OPTIONAL ENHANCEMENT STEPS (5-8)                           |
|                                                                              |
|  +-------------------------------------------------------------+           |
|  |                    STEP 5: TEXT-TO-SPEECH                   |           |
|  |  +--------------------+         +--------------------+      |           |
|  |  |  OPENAI TTS        |         |  ELEVENLABS        |      |           |
|  |  |  - Default voice:  |         |  - Default voice:  |      |           |
|  |  |    coral           |         |    JBFqnCBsd6RMk.. |      |           |
|  |  |  - gpt-4o-mini-tts |         |  - eleven_flash_   |      |           |
|  |  |  - WAV output      |         |    v2_5            |      |           |
|  |  |                    |         |  - MP3 44.1kHz     |      |           |
|  |  +--------------------+         +--------------------+      |           |
|  |  OUTPUT: speech.wav or speech.mp3                           |           |
|  +-------------------------------------------------------------+           |
|                                                                              |
|  +-------------------------------------------------------------+           |
|  |                   STEP 6: AI IMAGE GENERATION               |           |
|  |  +----------------------------------------------------------+  |       |
|  |  | OpenAI DALL-E (gpt-image-1)                              |  |       |
|  |  | Select 1-3 image types:                                  |  |       |
|  |  |  - Key Moment    - Thumbnail    - Conceptual            |  |       |
|  |  |  - Infographic   - Character    - Quote                 |  |       |
|  |  |                                                          |  |       |
|  |  | Sequential generation with progress tracking             |  |       |
|  |  | Template injection: {title} + {summary}                  |  |       |
|  |  | Output: 1024x1024 PNG (high quality)                    |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  OUTPUT: image_{type}.png (1-3 files)                          |       |
|  +-------------------------------------------------------------+           |
|                                                                              |
|  +-------------------------------------------------------------+           |
|  |                   STEP 7: MUSIC GENERATION                  |           |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 1: Lyrics Generation (OpenAI)                      |  |       |
|  |  |  - Genre-specific prompts                                |  |       |
|  |  |  - Copyright-safe, original content                      |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 2: Music Composition (ElevenLabs Music)            |  |       |
|  |  |  - Genres: rap, rock, pop, country, folk, jazz          |  |       |
|  |  |  - music_v1 model                                        |  |       |
|  |  |  - 3-minute MP3 output (180,000ms)                       |  |       |
|  |  |  - Streaming audio processing                            |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  OUTPUT: music-lyrics-prompt.md + music-lyrics.txt + music.mp3 |       |
|  +-------------------------------------------------------------+           |
|                                                                              |
|  +-------------------------------------------------------------+           |
|  |                   STEP 8: VIDEO GENERATION                  |           |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 1: Scene Description Generation (OpenAI LLM)       |  |       |
|  |  |  - Video type-specific prompts                           |  |       |
|  |  |  - Types: explainer, highlight, intro, outro, social    |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 2: Video Rendering (OpenAI Sora)                   |  |       |
|  |  |  - Models: sora-2, sora-2-pro                           |  |       |
|  |  |  - Sizes: 1920x1080, 1080x1920, 1280x720, 720x1280      |  |       |
|  |  |  - Duration: configurable (seconds)                      |  |       |
|  |  |  - Job-based API with polling                           |  |       |
|  |  |  - Downloads video + optional thumbnail                  |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  OUTPUT: video-scene-{type}.md + video_*.mp4 + *_thumb.webp    |       |
|  +-------------------------------------------------------------+           |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                         FINAL OUTPUT PACKAGE                                |
|                                                                              |
|  ./output/{timestamp}/                                                      |
|    +- audio.wav                    (Step 1: Source audio - local/direct)   |
|    +- metadata.json                (Step 1: Processing metadata)           |
|    +- transcription.txt            (Step 2: Timestamped text)              |
|    +- prompt.md                    (Step 4: LLM prompt)                    |
|    +- summary.md                   (Step 4: Generated content)             |
|    +- speech.wav/mp3               (Step 5: TTS narration) [optional]     |
|    +- image_{type}.png (1-3)       (Step 6: AI images) [optional]         |
|    +- music-lyrics-prompt.md       (Step 7: Lyrics prompt) [optional]     |
|    +- music-lyrics.txt             (Step 7: Lyrics) [optional]            |
|    +- music.mp3                    (Step 7: Soundtrack) [optional]        |
|    +- video-scene-{type}.md        (Step 8: Scene prompts) [optional]     |
|    +- video-scene-description-*.md (Step 8: Scene descriptions) [optional]|
|    +- video_*.mp4                  (Step 8: Generated videos) [optional]  |
|    +- video_*_thumb.webp           (Step 8: Thumbnails) [optional]        |
|                                                                              |
|  Comprehensive multimedia content package ready for distribution            |
+-----------------------------------------------------------------------------+
```

## Progress Tracking Architecture

```
+----------------------------------------------------------------------------+
|                          PROGRESS TRACKER SYSTEM                           |
|                                                                             |
|  Client (Browser)                                                          |
|       ^                                                                    |
|       | Server-Sent Events (SSE) via job polling                          |
|       |                                                                    |
|  +----+----------------------------------------------------------------+  |
|  | IProgressTracker Interface (src/types/progress.ts)                   |  |
|  |                                                                       |  |
|  |  startStep(step: number, message: string)                            |  |
|  |       |                                                              |  |
|  |  updateStepProgress(step: number, progress: number, message: string) |  |
|  |       |                                                              |  |
|  |  updateStepWithSubStep(step, current, total, description, message)   |  |
|  |       |                                                              |  |
|  |  Emits: { step, stepProgress, overallProgress, subStep: {...} }      |  |
|  |       |                                                              |  |
|  |  completeStep(step: number, message: string)                         |  |
|  |       |                                                              |  |
|  |  complete(showNoteId: string)                                        |  |
|  |       |                                                              |  |
|  |  Emits: { status: 'completed', showNoteId: '...' }                   |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  Progress Update Schema:                                                   |
|  +----------------------------------------------------------------------+  |
|  | {                                                                     |  |
|  |   step: number,                                                      |  |
|  |   stepName: string,                                                  |  |
|  |   stepProgress: number,                                              |  |
|  |   overallProgress: number,                                           |  |
|  |   status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped',|
|  |   message: string,                                                   |  |
|  |   subStep?: { current: number, total: number, description?: string },|  |
|  |   error?: string,                                                    |  |
|  |   showNoteId?: string                                                |  |
|  | }                                                                     |  |
|  +----------------------------------------------------------------------+  |
+----------------------------------------------------------------------------+
```

## Service Selection Flow

```
+----------------------------------------------------------------------------+
|                        ROUTING & SERVICE SELECTION                         |
|                                                                             |
|  Input Classification                                                      |
|       |                                                                    |
|       +- isLocalFile?                                                     |
|       |    +- YES -> processFile()                                        |
|       |    |         +- ffmpeg audio conversion                           |
|       |    |         +- Groq Whisper transcription (required)             |
|       |    |                                                              |
|       +- urlType === 'direct-file'?                                       |
|       |    +- YES -> processDirectUrl()                                   |
|       |    |         +- Download: curl                                    |
|       |    |         +- Groq Whisper transcription (required)             |
|       |    |                                                              |
|       +- Streaming URL (YouTube, etc.)?                                   |
|            +- YES -> processVideo()                                       |
|            |         +- HappyScribe transcription (required)              |
|            |         +- Direct URL processing (no local download)         |
|            |         +- Speaker diarization support                       |
|                                                                             |
|  Steps 4-8 Service Selection                                               |
|       |                                                                    |
|       +- Step 4 (LLM): Always OpenAI (user-configured model)              |
|       +- Step 5 (TTS): User choice (OpenAI or ElevenLabs)                 |
|       +- Step 6 (Images): Always OpenAI DALL-E (gpt-image-1)              |
|       +- Step 7 (Music): OpenAI (lyrics) + ElevenLabs Music (composition) |
|       +- Step 8 (Video): OpenAI LLM (scene) + OpenAI Sora (video)         |
+----------------------------------------------------------------------------+
```
