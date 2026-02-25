# Audio Processing

Process audio/video content through the complete 8-step pipeline to generate show notes, transcriptions, summaries, and optional media outputs.

## Outline

- [Endpoint](#endpoint)
- [Description](#description)
- [Request](#request)
- [Selected Prompts Options](#selected-prompts-options)
- [Video Prompt Types](#video-prompt-types)
- [Response](#response)
- [Step Breakdown](#step-breakdown)
- [Example Client Implementation (JavaScript)](#example-client-implementation-javascript)
- [Example using curl](#example-using-curl)
- [Validation Rules](#validation-rules)
- [Database Storage](#database-storage)
- [Output Files](#output-files)
- [Notes](#notes)

## Endpoint

```
POST /api/process
```

## Description

Main processing endpoint that accepts either a URL or uploaded file path and creates a background processing job. Returns a job ID for polling status via the [Job Status](./jobs.md) endpoint.

The pipeline includes:

1. **Download & Audio Extraction** - Download/convert audio to 16kHz mono WAV (or extract text from documents)
2. **Transcription** - Generate transcript using Groq, DeepInfra, HappyScribe, Fal, Gladia, ElevenLabs, Rev, AssemblyAI, Deepgram, or Soniox (or document extraction via LlamaParse/Mistral OCR)
3. **Prompt Selection** - Already selected via form (summaries, chapters, etc.)
4. **LLM Processing** - Generate show notes using OpenAI, Claude, Gemini, MiniMax, Grok, or Groq
5. **Text-to-Speech** (optional) - Convert summary to audio via OpenAI, ElevenLabs, or Groq
6. **Image Generation** (optional) - Create thumbnail/promotional images via OpenAI, Gemini, MiniMax, or Grok
7. **Music Generation** (optional) - Generate background music via ElevenLabs or MiniMax
8. **Video Generation** (optional) - Generate video clips via OpenAI Sora, Gemini Veo, MiniMax, or Grok

## Request

**Content-Type:** `multipart/form-data`

**Form Fields:**

### Required Fields

| Field             | Type   | Required | Description                                                  |
|-------------------|--------|----------|--------------------------------------------------------------|
| `llmService`      | string | Yes      | LLM provider: `openai`, `claude`, `gemini`, `minimax`, `grok`, `groq` |
| `llmModel`        | string | Yes      | LLM model ID for the selected provider                       |
| `selectedPrompts` | string | Yes      | Comma-separated list of content types to generate            |

### Source Fields (One Required)

| Field              | Type   | Required    | Description                                                              |
|--------------------|--------|-------------|--------------------------------------------------------------------------|
| `url`              | string | Conditional | URL to process (if not using uploaded file)                              |
| `urlType`          | string | Conditional | URL type from verify-url: `youtube`, `streaming`, `direct-file`, `document` |
| `urlDuration`      | string | Optional    | Duration in seconds (from verify-url)                                    |
| `urlFileSize`      | string | Optional    | File size in bytes (from verify-url)                                     |
| `uploadedFilePath` | string | Conditional | Server file path from upload/upload-chunk (if not using URL)             |
| `uploadedFileName` | string | Conditional | Original filename (if using uploaded file)                               |

### Transcription Options

| Field                 | Type   | Required | Description                                                                                                                                                                       |
|-----------------------|--------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `transcriptionOption` | string | Yes      | Service: `groq`, `deepinfra`, `happyscribe`, `fal`, `gladia`, `elevenlabs`, `rev`, `assembly`, `deepgram`, `soniox`                             |
| `transcriptionModel`  | string | Yes      | Model ID (service-specific; must match selected service) |

### Optional Features

| Field                   | Type   | Required    | Description                                                                      |
|-------------------------|--------|-------------|----------------------------------------------------------------------------------|
| `ttsEnabled`            | string | No          | Enable TTS: `"true"` or `"false"` (default: `"false"`)                           |
| `ttsService`            | string | Conditional | TTS service (if enabled): `openai`, `elevenlabs`, or `groq`                      |
| `ttsVoice`              | string | Conditional | Voice ID/name (if TTS enabled)                                                   |
| `ttsModel`              | string | Conditional | TTS model (if TTS enabled)                                                       |
| `imageGenEnabled`       | string | No          | Enable image generation: `"true"` or `"false"` (default: `"false"`)              |
| `imageService`          | string | Conditional | Image service (if enabled): `openai`, `gemini`, `minimax`, or `grok`     |
| `imageModel`            | string | Conditional | Image model (if enabled; must match selected service)                            |
| `imageDimensionOrRatio` | string | Conditional | OpenAI uses dimensions (e.g., `1024x1024`), others use aspect ratios (e.g., `1:1`) |
| `selectedImagePrompts`  | string | Conditional | Comma-separated image prompts (if image gen enabled)                             |
| `musicGenSkipped`       | string | No          | Skip music generation: `"true"` or `"false"` (default: `"false"`)                |
| `musicService`          | string | Conditional | Music service (if enabled): `elevenlabs` or `minimax`                            |
| `musicModel`            | string | Conditional | Music model (if enabled; must match selected service)                            |
| `selectedMusicGenre`    | string | Conditional | Genre (service-specific). ElevenLabs: `rap`, `rock`, `pop`, `country`, `folk`, `jazz`. MiniMax: `pop`, `rock`, `rap`, `country`, `electronic`, `jazz` |
| `musicPreset`           | string | Conditional | Required if music enabled: `cheap`, `balanced`, or `quality`                     |
| `musicDurationSeconds`  | string | Conditional | Required if music enabled: integer between `3` and `300`                         |
| `musicInstrumental`     | string | Conditional | Required if music enabled: `"true"` or `"false"`                                 |
| `musicSampleRate`       | string | Optional    | MiniMax advanced override: `16000`, `24000`, `32000`, `44100`                    |
| `musicBitrate`          | string | Optional    | MiniMax advanced override: `32000`, `64000`, `128000`, `256000`                  |
| `videoGenEnabled`       | string | No          | Enable video generation: `"true"` or `"false"` (default: `"false"`)              |
| `videoService`          | string | Conditional | Video service (if enabled): `openai`, `gemini`, `minimax`, or `grok`    |
| `selectedVideoPrompts`  | string | Conditional | Comma-separated video types (if video gen enabled)                               |
| `videoModel`            | string | Conditional | Video model (service-specific; see Video Services below)                         |
| `videoSize`             | string | Conditional | Video size (service-specific; see Video Services below)                          |
| `videoAspectRatio`      | string | Conditional | Video aspect ratio (service-specific; see Video Services below)                  |
| `videoDuration`         | string | Conditional | Video duration in seconds (service-specific; see Video Services below)           |

### Document Processing Options

| Field                  | Type   | Required | Description                                                                           |
|------------------------|--------|----------|---------------------------------------------------------------------------------------|
| `documentService`      | string | No       | Document extraction service: `llamaparse` or `mistral-ocr`                            |
| `documentModel`        | string | No       | Model for document extraction (service-specific defaults)                             |
| `documentType`         | string | No       | Document type: `pdf`, `png`, `jpg`, `tiff`, `txt`, `docx` (auto-detected from extension) |
| `disableDocumentCache` | string | No       | Disable document cache: `"true"` or `"false"` (default: `"false"`)                    |

## Selected Prompts Options

**Summaries and Chapters:**
- `shortSummary` - Brief overview
- `mediumSummary` - Standard summary
- `longSummary` - Detailed summary
- `bulletPoints` - Key points list
- `takeaways` - Main takeaways
- `faq` - Frequently asked questions
- `shortChapters` - Concise chapter breakdown
- `mediumChapters` - Standard chapter detail
- `longChapters` - Detailed chapter summaries

**Extras:**
- `quotes` - Notable quotes
- `titles` - Title suggestions
- `facebook` - Facebook post
- `instagram` - Instagram post
- `linkedin` - LinkedIn post
- `tiktok` - TikTok script
- `x` - X (Twitter) post
- `poetryCollection` - Poetry collection
- `screenplay` - Screenplay
- `shortStory` - Short story
- `contentStrategy` - Content strategy outline
- `emailNewsletter` - Email newsletter
- `seoArticle` - SEO article
- `courseCurriculum` - Course curriculum
- `questions` - Discussion questions
- `assessmentGenerator` - Assessment generator
- `flashcards` - Q/A flashcards
- `howToGuide` - How-to guide
- `studyGuide` - Study guide
- `trainingManual` - Training manual
- `troubleshootingGuide` - Troubleshooting guide
- `pressRelease` - Press release
- `competitiveAnalysis` - Competitive analysis
- `trendAnalysis` - Trend analysis
- `meetingActions` - Meeting actions
- `voiceReflection` - Voice reflection
- `goalSetting` - Goal setting
- `careerPlan` - Career plan
- `progressAnalysis` - Progress analysis

## Video Prompt Types

- `explainer` - Explainer video
- `highlight` - Highlight reel
- `intro` - Introduction video
- `outro` - Outro video
- `social` - Social media clip

## Image Prompt Types

- `keyMoment` - Key moment
- `thumbnail` - Thumbnail
- `conceptual` - Conceptual illustration
- `infographic` - Infographic
- `character` - Character portrait
- `quote` - Quote card

## Video Services

Video sizes, durations, and aspect ratios are service-specific.

**OpenAI (Sora):**
- Models: `sora-2`, `sora-2-pro`
- Sizes: `1920x1080`, `1080x1920`, `1280x720`, `720x1280`
- Durations (seconds): `4`, `8`, `12`

**Gemini (Veo):**
- Models: `veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`
- Sizes: `720p`, `1080p`, `4k`
- Durations (seconds): `4`, `6`, `8`
- Aspect ratios: `16:9`, `9:16`

**MiniMax (Hailuo):**
- Models: `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-02`, `T2V-01-Director`, `T2V-01`
- Sizes: `768P`, `1080P`, `720P`
- Durations (seconds): `6`, `10`

**Grok:**
- Models: `grok-imagine-video`
- Sizes: `720p`, `480p`
- Durations (seconds): `1` through `15`
- Aspect ratios: `16:9`, `4:3`, `1:1`, `9:16`, `3:4`, `3:2`, `2:3`

## Response

**Content-Type:** `application/json`

**Success Response (200):**

```json
{
  "jobId": "job_1700654321000_abc123xyz"
}
```

**Error Response (400):**

```json
{
  "error": "LLM model is required"
}
```

**Error Response (500):**

```json
{
  "error": "Failed to start processing"
}
```

## Step Breakdown

**Step 1: Download & Audio Extraction (12% weight)**
- Downloads/locates audio file
- Converts to 16kHz mono WAV using ffmpeg
- Extracts metadata
- Saves `audio.wav` and `metadata.json`

**Step 2: Transcription (35% weight)**
- Routes to Groq, DeepInfra, HappyScribe, Fal, Gladia, ElevenLabs, Rev, AssemblyAI, Deepgram, or Soniox (audio) or LlamaParse/Mistral OCR (documents)
- Segments audio if duration > 10 minutes (all services)
- Generates timestamped transcript
- Saves `transcription.txt`

**Step 3: Prompt Selection (5% weight)**
- Builds prompt from selected content types
- Assembles instructions and examples
- Injects metadata and transcript

**Step 4: LLM Processing (20% weight)**
- Sends prompt to selected LLM provider (OpenAI, Claude, Gemini, MiniMax, Grok, or Groq)
- Automatic retry with fallback to alternate models/services
- Generates structured JSON output
- Saves `text-output.json`

**Step 5: Text-to-Speech (5% weight, optional)**
- Converts summary to audio
- Uses OpenAI, ElevenLabs, or Groq TTS
- Saves audio file

**Step 6: Image Generation (5% weight, optional)**
- Generates images from selected prompts
- Uses OpenAI, Gemini, MiniMax, or Grok (model defaults derived from config)
- Saves image files

**Step 7: Music Generation (5% weight, optional)**
- Generates lyrics via LLM
- Generates background music via ElevenLabs or MiniMax
- Saves lyrics and music files

**Step 8: Video Generation (13% weight, optional)**
- Generates scene descriptions via LLM
- Generates video clips via OpenAI Sora, Gemini Veo, MiniMax, or Grok
- Saves video files with thumbnails

## Example Client Implementation (JavaScript)

```javascript
async function processAudio(formData) {
  // 1. Start processing job
  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData
  })
  
  const { jobId, error } = await response.json()
  
  if (error) {
    console.error('Failed to start job:', error)
    return
  }
  
  console.log('Job started:', jobId)
  
  // 2. Poll for status
  const pollStatus = async () => {
    const job = await fetch(`/api/jobs/${jobId}`).then(r => r.json())
    
    console.log(`Step ${job.currentStep}: ${job.stepName}`)
    console.log(`Progress: ${job.overallProgress}%`)
    
    if (job.status === 'error') {
      console.error('Processing error:', job.error)
      return
    }
    
    if (job.status === 'completed') {
      console.log('Complete! Show Note ID:', job.showNoteId)
      window.location.href = `/show-notes/${job.showNoteId}`
      return
    }
    
    // Continue polling
    setTimeout(pollStatus, 2000)
  }
  
  pollStatus()
}

// Usage with URL
const formData = new FormData()
formData.append('url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
formData.append('urlType', 'youtube')
formData.append('transcriptionOption', 'groq')
formData.append('llmService', 'openai')
formData.append('llmModel', 'gpt-5.2')
formData.append('selectedPrompts', 'shortSummary,shortChapters')
formData.append('ttsEnabled', 'false')
formData.append('imageGenEnabled', 'false')
formData.append('musicGenSkipped', 'true')
formData.append('videoGenEnabled', 'false')

await processAudio(formData)
```

## Example using curl

```bash
curl -X POST http://localhost:4321/api/process \
  -F "url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  -F "urlType=youtube" \
  -F "transcriptionOption=groq" \
  -F "llmService=openai" \
  -F "llmModel=gpt-5.2" \
  -F "selectedPrompts=shortSummary,shortChapters" \
  -F "ttsEnabled=false" \
  -F "imageGenEnabled=false" \
  -F "musicGenSkipped=true" \
  -F "videoGenEnabled=false"
```

Response:
```json
{
  "jobId": "job_1700654321000_abc123xyz"
}
```

## Validation Rules

1. **Source Selection:**
   - Must provide exactly one: `url` + `urlType` OR `uploadedFilePath` + `uploadedFileName`
   - Cannot provide both URL and uploaded file

2. **LLM Service + Model:**
   - Both required and must not be empty
   - Model ID must match selected `llmService`

3. **Selected Prompts:**
   - Must select at least one content type
   - Comma-separated, no spaces

4. **TTS Options:**
   - If `ttsEnabled=true`, must provide `ttsService`, `ttsModel`, and `ttsVoice`

5. **Image Generation:**
   - If `imageGenEnabled=true`, must provide `imageService`, `imageModel`, `imageDimensionOrRatio`, and at least one `selectedImagePrompts`

6. **Video Generation:**
   - If `videoGenEnabled=true`, must provide `videoService`, `videoModel`, `videoSize`, `videoDuration`, and at least one `selectedVideoPrompts`

7. **Music Generation:**
   - If music is enabled (`musicGenSkipped=false`), must provide `musicService`, `musicModel`, `selectedMusicGenre`, `musicPreset`, `musicDurationSeconds`, and `musicInstrumental`

8. **Transcription:**
   - `transcriptionOption` required
   - `transcriptionModel` required and must match selected service
   - HappyScribe only available for streaming URLs (not local files)

## Database Storage

Upon successful completion:
- Show note saved to SQLite database
- Job record updated with `status: 'completed'` and `show_note_id`
- Accessible via `/show-notes/{showNoteId}` route

## Output Files

Files saved to `./output/{showNoteId}/`:
- `audio.wav` - Processed audio (16kHz mono)
- `metadata.json` - Video/audio metadata
- `transcription.txt` - Timestamped transcript
- `prompt.md` - LLM prompt used
- `text-output.json` - Generated structured output
- `{ttsService}-summary.{ext}` - TTS audio (if enabled)
- `{prompt}-{timestamp}.png` - Generated images (if enabled)
- `music-lyrics-prompt.md` - Music lyrics prompt (if enabled)
- `music-lyrics.txt` - Generated lyrics (if enabled)
- `music-{timestamp}.mp3` - Generated music (if enabled)
- `video-scene-{type}.md` - Video scene prompts (if enabled)
- `video-scene-description-{type}.md` - Generated scene descriptions (if enabled)
- `{promptType}-{timestamp}.mp4` - Generated videos (if enabled)

## Notes

- Processing runs in background after job creation
- Poll the [Job Status](./jobs.md) endpoint for progress updates
- Processing can take several minutes depending on audio length and selected features
- Errors stop processing immediately and update job status to `error`
- Successfully completed steps stored even if later steps fail
