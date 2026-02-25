## Detailed Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                              USER INPUT                                     |
|  +----------+   +----------+   +------------+   +-----------+               |
|  |Local File|   |Direct URL|   |Streaming   |   | Document  |               |
|  |(.mp3/.mp4|   |(.mp3/.wav|   |URL(YouTube)|   |(.pdf/.docx|               |
|  +----+-----+   +----+-----+   +-----+------+   +-----+-----+               |
+-------+---------------+---------------+----------------+--------------------+
        |               |               |                |
        v               v               v                v
+-----------------------------------------------------------------------------+
|                   STEP 1: DOWNLOAD & AUDIO/DOCUMENT EXTRACTION              |
|  +----------------------------------------------------------------------+   |
|  | Route Selection (process-job.ts)                                     |   |
|  |  1. inputType=document -> processDocument()                          |   |
|  |  2. isLocalFile=true -> processFile()                                |   |
|  |  3. urlType=direct-file + useResilientDownload -> processDirectUrl() |   |
|  |  4. Default -> processVideo()                                        |   |
|  +----------------------------------------------------------------------+   |
|                                                                             |
|  +------------------------------+  +------------------------------+         |
|  | Audio Pipeline (Local/Direct)|  | Video Pipeline (Streaming)   |         |
|  |                              |  |                              |         |
|  | 1. curl download (direct)    |  | 1. yt-dlp metadata extract   |         |
|  |    OR local file validation  |  | 2. No audio download         |         |
|  |                              |  | 3. URL passed to HappyScribe |         |
|  | 2. ffmpeg dual conversion:   |  |                              |         |
|  |    - 16kHz mono PCM WAV      |  |                              |         |
|  |    - 32k MP3 (lowpass 8kHz)  |  |                              |         |
|  |                              |  |                              |         |
|  | 3. File size check:          |  |                              |         |
|  |    <100MB: parallel convert  |  |                              |         |
|  |    >=100MB: sequential       |  |                              |         |
|  +------------------------------+  +------------------------------+         |
|                                                                             |
|  +----------------------------------------------------------------------+  |
|  | Document Pipeline (PDF/DOCX/PNG/JPG/TXT)                             |  |
|  |  1. Metadata extraction (title, page count, file size)               |  |
|  |  2. S3 backup to Railway (see S3 STORAGE section below)              |  |
|  |  3. No audio extraction                                              |  |
|  |  4. Pass to document extraction (Step 2)                             |  |
|  +----------------------------------------------------------------------+  |
|                                                                              |
|  OUTPUT (Audio): audio.wav + audio.mp3 + metadata.json                      |
|  OUTPUT (Video): metadata.json only (audio handled by HappyScribe)          |
|  OUTPUT (Doc): metadata.json + backup URL                                   |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                   STEP 2: TRANSCRIPTION & EXTRACTION                        |
|  +----------------------------------------------------------------------+  |
|  | Service Router (run-transcribe.ts)                                   |  |
|  |  - Audio >10min (600s) -> auto-split into 10min segments            |  |
|  |  - Each segment transcribed with time offset tracking               |  |
|  |  - Results combined with proper timestamps                           |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  +----------------------------------+   +----------------------------+      |
|  | TRANSCRIPTION SERVICES           |   | DOCUMENT EXTRACTION        |      |
|  | (Audio/Video)                    |   | (PDF/Images/DOCX)          |      |
|  +----------------------------------+   |                            |      |
|  | WITH SPEAKER DIARIZATION         |   | - LlamaParse               |      |
|  |                                  |   |   - PDF/DOCX -> markdown   |      |
|  | - HappyScribe (streaming only)   |   |   - Multi-page support     |      |
|  |   happyscribe-auto               |   |                            |      |
|  |   Speaker labels & timestamps    |   | - Mistral OCR              |      |
|  |                                  |   |   - Image/PDF -> text      |      |
|  | - Assembly                       |   |   - Vision model based     |      |
|  |   universal/slam-1               |   |                            |      |
|  |   speaker_labels: true           |   +----------------------------+      |
|  |                                  |                                        |
|  | - Deepgram                       |   OUTPUT (Transcription):              |
|  |   nova-3                         |   - transcription.txt                  |
|  |   diarize: true                  |   - With diarization:                  |
|  |                                  |       [00:00:15] [Speaker 1] Text      |
|  | - Soniox                         |   - Without diarization:               |
|  |   stt-async-v4                   |       [00:00:05] Text only             |
|  |   enable_speaker_diarization     |                                        |
|  |                                  |   OUTPUT (Document):                   |
|  | - Rev                            |   - extracted-content.md               |
|  |   rev-machine                    |                                        |
|  |   skip_diarization: false        |                                        |
|  |                                  |                                        |
|  | - Gladia                         |                                        |
|  |   gladia-v2                      |                                        |
|  |   enableDiarization: true        |                                        |
|  |                                  |                                        |
|  | - ElevenLabs Scribe              |                                        |
|  |   scribe_v2                      |                                        |
|  |   diarize: true                  |                                        |
|  |                                  |                                        |
|  | - Fal                            |                                        |
|  |   fal-ai/whisper                 |                                        |
|  |   speaker diarization enabled    |                                        |
|  |                                  |                                        |
|  +----------------------------------+                                        |
|  | WITHOUT SPEAKER DIARIZATION      |                                        |
|  |                                  |                                        |
|  | - Groq Whisper (default)         |                                        |
|  |   whisper-large-v3-turbo         |                                        |
|  |                                  |                                        |
|  | - DeepInfra Whisper              |                                        |
|  |   openai/whisper-large-v3-turbo  |                                        |
|  +----------------------------------+                                        |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                 STEP 3: PROMPT ASSEMBLY & SCHEMA GENERATION                 |
|  +----------------------------------------------------------------------+  |
|  | buildStructuredPrompt() (build-prompt.ts)                             |  |
|  |  1. System instructions:                                              |  |
|  |     - Quality guidelines (no "delve", no ads)                         |  |
|  |     - Timestamp format requirements (HH:MM:SS)                        |  |
|  |     - Accuracy requirements                                           |  |
|  |  2. LLM instructions for each selected prompt:                        |  |
|  |     - Retrieved from PROMPT_CONFIG[promptType].llmInstruction         |  |
|  |     - Example: "shortSummary" -> one-sentence, max 180 chars         |  |
|  |  3. Video metadata:                                                   |  |
|  |     - Title, URL, Author, Duration                                    |  |
|  |  4. Complete transcript text                                          |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  +----------------------------------------------------------------------+  |
|  | createDynamicSchema() (create-schema.ts)                              |  |
|  |  - Builds JSON Schema from PROMPT_CONFIG definitions                  |  |
|  |  - Each prompt type has schema (type, description, items)             |  |
|  |  - Examples:                                                          |  |
|  |    * shortSummary: string (max 180 chars)                             |  |
|  |    * chapters: array of {timestamp, title, description}               |  |
|  |    * faq: array of {question, answer}                                 |  |
|  |  - Sets required fields and additionalProperties: false               |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  OUTPUT: Assembled prompt string + Dynamic JSON Schema                      |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                  STEP 4: LLM STRUCTURED OUTPUT GENERATION                   |
|  +----------------------------------------------------------------------+  |
|  | Supported Providers (all with structured JSON output)                |  |
|  |  - OpenAI: native JSON schema support (strict mode)                  |  |
|  |  - Claude: system prompt with schema definition                      |  |
|  |  - Gemini: structured output support                                 |  |
|  |  - Groq: structured output support                                   |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  +----------------------------------------------------------------------+  |
|  | runStructuredLLMWithRetry() - 3-Attempt Retry Logic                  |  |
|  |                                                                        |  |
|  |  Attempt 1: User-selected provider + model                            |  |
|  |       |                                                               |  |
|  |       ├─> Success: Return response                                    |  |
|  |       └─> Failure: Continue to Attempt 2                              |  |
|  |                                                                        |  |
|  |  Attempt 2: Same provider, same model (retry)                         |  |
|  |       |                                                               |  |
|  |       ├─> Success: Return response (log retry success)                |  |
|  |       └─> Failure: Try alternate model for provider OR next provider |  |
|  |                                                                        |  |
|  |  Attempt 3: Alternate model OR fallback provider                      |  |
|  |       |                                                               |  |
|  |       ├─> Success: Return response (log retry success)                |  |
|  |       └─> Failure: Throw error with all attempt details               |  |
|  |                                                                        |  |
|  |  Fallback Provider Order: Gemini -> OpenAI -> Claude -> Groq         |  |
|  |  (Skips providers without API keys configured)                        |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  +----------------------------------------------------------------------+  |
|  | Provider-Specific Implementations                                     |  |
|  |                                                                        |  |
|  |  OpenAI (run-openai-text.ts)                                          |  |
|  |    - Uses responses.create() with JSON schema                         |  |
|  |    - format: { type: 'json_schema', strict: true, schema: {...} }    |  |
|  |    - Parses output_text as JSON                                       |  |
|  |                                                                        |  |
|  |  Claude (run-claude-text.ts)                                          |  |
|  |    - Uses messages.create() with system prompt                        |  |
|  |    - System prompt includes JSON schema definition                    |  |
|  |    - Strips markdown fences, parses as JSON                           |  |
|  |    - max_tokens: 16384                                                |  |
|  |                                                                        |  |
|  |  Gemini & Groq (similar structured output approaches)                 |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  OUTPUT: prompt.md (audit trail) + text-output.json (structured data)       |
|          Metadata: {service, model, inputTokens, outputTokens, time}        |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                  OPTIONAL ENHANCEMENT STEPS (5-8)                           |
|                                                                             |
|  +-------------------------------------------------------------+           |
|  |                    STEP 5: TEXT-TO-SPEECH                   |           |
|  |  +------------------+  +------------------+  +------------+ |           |
|  |  |  OPENAI TTS      |  |  ELEVENLABS      |  |  GROQ TTS  | |           |
|  |  |  - Default voice:|  |  - Default voice:|  |  - Default:| |           |
|  |  |    coral         |  |    JBFqnCBsd6... |  |    hannah  | |           |
|  |  |  - Default model:|  |  - Default model:|  |  - Model:  | |           |
|  |  |    gpt-4o-mini-  |  |    eleven_flash_ |  |    canopy  | |           |
|  |  |    tts           |  |    v2_5          |  |    labs/   | |           |
|  |  |  - WAV output    |  |  - MP3 44.1kHz   |  |    orpheus | |           |
|  |  |  - Instructions  |  |    output        |  |    -v1     | |           |
|  |  |    support       |  |                  |  |  - 200-char| |           |
|  |  |                  |  |                  |  |    chunks  | |           |
|  |  |                  |  |                  |  |  - WAV out | |           |
|  |  +------------------+  +------------------+  +------------+ |           |
|  |  OUTPUT: speech.wav or speech.mp3 + S3 upload (if configured) |           |
|  +-------------------------------------------------------------+           |
|                                                                            |
|  +-------------------------------------------------------------+           |
|  |                   STEP 6: AI IMAGE GENERATION               |           |
|  |  +----------------------------------------------------------+  |       |
|  |  | OPENAI DALL-E        | GEMINI IMAGE      | MINIMAX       |  |       |
|  |  |  - Model:            |  - Model:         |  - Model:     |  |       |
|  |  |    gpt-image-1.5     |    gemini-2.5-    |    image-01   |  |       |
|  |  |  - Dimensions:       |    flash-image    |  - Ratios:    |  |       |
|  |  |    1024x1024,        |  - Aspect ratios: |    1:1, 16:9, |  |       |
|  |  |    1536x1024,        |    1:1, 16:9,     |    4:3, 3:2,  |  |       |
|  |  |    1024x1536         |    9:16, etc      |    9:16, 21:9 |  |       |
|  |  |  - Response:         |  - Response:      |  - Response:  |  |       |
|  |  |    b64_json          |    inline base64  |    base64     |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  | All services support:                                    |  |       |
|  |  |  - 1-3 image types per job (configurable)                |  |       |
|  |  |  - Sequential generation with progress tracking          |  |       |
|  |  |  - Template injection: {title} + {summary}               |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  OUTPUT: image_{type}.png (1-3) + S3 upload (if configured)    |       |
|  +-------------------------------------------------------------+           |
|                                                                            |
|  +-------------------------------------------------------------+           |
|  |                   STEP 7: MUSIC GENERATION                  |           |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 1: Lyrics Generation (LLM)                         |  |       |
|  |  |  - LLM Service: OpenAI/Claude/Gemini/Groq               |  |       |
|  |  |  - Genre-specific prompts with enhancements             |  |       |
|  |  |  - Copyright-safe, original content                      |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 2: Music Composition                               |  |       |
|  |  |                                                          |  |       |
|  |  | ELEVENLABS (default)       | MINIMAX                     |  |       |
|  |  |  - Model: music_v1         |  - Model: music-2.5         |  |       |
|  |  |  - Duration: 180s (3 min)  |  - Lyrics: 1-3500 chars     |  |       |
|  |  |  - Streaming audio         |  - Structured lyrics tags   |  |       |
|  |  |  - MP3 output              |    ([Verse], [Chorus])      |  |       |
|  |  |                            |  - Hex-encoded response     |  |       |
|  |  | GEMINI LYRIA               |  - MP3 output (44.1kHz)     |  |       |
|  |  |  - Model: lyria-realtime   |                             |  |       |
|  |  |  - Duration: 30s           |                             |  |       |
|  |  |  - RealTime streaming      |                             |  |       |
|  |  |  - PCM to MP3 conversion   |                             |  |       |
|  |  |                                                          |  |       |
|  |  |  Genres: rap, rock, pop, country, folk, jazz, ambient,  |  |       |
|  |  |          electronic, cinematic, techno, lofi             |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  OUTPUT: music-*.md + music-lyrics.txt + music.mp3 + S3 upload |       |
|  +-------------------------------------------------------------+           |
|                                                                            |
|  +-------------------------------------------------------------+           |
|  |                   STEP 8: VIDEO GENERATION                  |           |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 1: Scene Description Generation (LLM)              |  |       |
|  |  |  - LLM Service: OpenAI/Claude/Gemini/Groq               |  |       |
|  |  |  - Video type-specific prompts                           |  |       |
|  |  |  - Types: explainer, highlight, intro, outro, social     |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  | Phase 2: Video Rendering                                 |  |       |
|  |  |                                                          |  |       |
|  |  | OPENAI SORA (default)      | MINIMAX HAILUO              |  |       |
|  |  |  - Models: sora-2,         |  - Models: Hailuo-2.3,      |  |       |
|  |  |    sora-2-pro              |    Hailuo-02, T2V-01,       |  |       |
|  |  |  - Sizes: 1792x1024,       |    T2V-01-Director          |  |       |
|  |  |    1024x1792, 1280x720     |  - Sizes: 768P, 1080P, 720P |  |       |
|  |  |  - Duration: 4/8/12s       |  - Duration: 6/10s          |  |       |
|  |  |  - Job-based API           |  - 3-step async API:        |  |       |
|  |  |  - MP4 + WebP thumb        |    create -> poll -> download|  |       |
|  |  |                            |  - 1080P requires 6s only   |  |       |
|  |  | GEMINI VEO                 |  - Camera [Command] support |  |       |
|  |  |  - Models: veo-3.1,        |  - MP4 output               |  |       |
|  |  |    veo-3.1-fast            |                             |  |       |
|  |  |  - Resolutions: 720p/      |                             |  |       |
|  |  |    1080p/4k                |                             |  |       |
|  |  |  - Aspect: 16:9/9:16       |                             |  |       |
|  |  |  - Duration: 4/6/8s        |                             |  |       |
|  |  |  - Operation-based API     |                             |  |       |
|  |  |  - MP4 only (no thumb)     |                             |  |       |
|  |  |                                                          |  |       |
|  |  |  Safety: All services wrap prompts with safety prefix    |  |       |
|  |  +----------------------------------------------------------+  |       |
|  |  OUTPUT: video-scene-*.md + video_*.mp4 + thumb.webp + S3 upload   |
|  +-------------------------------------------------------------+           |
+------------------------------+----------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                         FINAL OUTPUT PACKAGE                                |
|                                                                             |
|  ./output/{timestamp}/                                                      |
|    +- audio.wav                    (Step 1: Source audio - local/direct)    |
|    +- metadata.json                (Step 1: Processing metadata)            |
|    +- transcription.txt            (Step 2: Timestamped text)               |
|    +- prompt.md                    (Step 4: LLM prompt)                     |
|    +- text-output.json             (Step 4: Generated content)              |
|    +- speech.wav/mp3               (Step 5: TTS narration) [optional]       |
|    +- image_{type}.png (1-3)       (Step 6: AI images) [optional]           |
|    +- music-lyrics-prompt.md       (Step 7: Lyrics prompt) [optional]       |
|    +- music-lyrics.txt             (Step 7: Lyrics) [optional]              |
|    +- music.mp3                    (Step 7: Soundtrack) [optional]          |
|    +- video-scene-{type}.md        (Step 8: Scene prompts) [optional]       |
|    +- video-scene-description-*.md (Step 8: Scene descriptions) [optional]  |
|    +- video_*.mp4                  (Step 8: Generated videos) [optional]    |
|    +- video_*_thumb.webp           (Step 8: Thumbnails) [optional]          |
|                                                                             |
|  Comprehensive multimedia content package ready for distribution            |
+-----------------------------------------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------+
|                     S3 STORAGE (Media & Document Backup)                    |
|                                                                             |
|  +----------------------------------------------------------------------+  |
|  | Shared S3 Utility (s3-upload.ts)                                     |  |
|  |                                                                       |  |
|  |  Purpose: Upload all media files to S3-compatible storage for         |  |
|  |           persistent access after local file cleanup                  |  |
|  |                                                                       |  |
|  |  uploadToS3(filePath, jobId, category):                               |  |
|  |    - Multipart upload for files >50MB                                 |  |
|  |    - Automatic content-type detection                                 |  |
|  |    - Returns { s3Url, objectKey, uploadedAt } or null if skipped      |  |
|  |                                                                       |  |
|  |  Storage Paths by Category:                                           |  |
|  |    - media/audio/{jobId}/*.wav|.mp3     (Step 1)                      |  |
|  |    - media/tts/{jobId}/*.wav|.mp3       (Step 5)                      |  |
|  |    - media/image/{jobId}/*.png|.webp    (Step 6)                      |  |
|  |    - media/music/{jobId}/*.mp3          (Step 7)                      |  |
|  |    - media/video/{jobId}/*.mp4|.webp    (Step 8)                      |  |
|  |    - document-backups/{jobId}/*         (Document backup)             |  |
|  |                                                                       |  |
|  |  Supported Content Types:                                             |  |
|  |    - pdf, png, jpg, jpeg, tiff, txt, docx                             |  |
|  |    - wav, mp3, mp4, webp                                              |  |
|  +----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Environment Variables (Required):                                    |  |
|  |    - BUCKET           : S3 bucket name                                |  |
|  |    - ACCESS_KEY_ID    : S3 access key                                 |  |
|  |    - SECRET_ACCESS_KEY: S3 secret key                                 |  |
|  |    - ENDPOINT         : S3 endpoint URL                               |  |
|  |    - REGION           : S3 region (optional, defaults to 'auto')      |  |
|  |                                                                       |  |
|  |  Note: If S3 credentials not configured, uploads are skipped silently |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  Database Storage (show_notes table S3 URL columns):                        |
|    - audio_s3_url     : Source audio file URL                               |
|    - tts_s3_url       : TTS audio file URL                                  |
|    - image_s3_urls    : Comma-separated image URLs                          |
|    - music_s3_url     : Music file URL                                      |
|    - video_s3_urls    : Comma-separated video URLs                          |
|    - thumbnail_s3_url : Comma-separated video thumbnail URLs                |
+-----------------------------------------------------------------------------+
```
