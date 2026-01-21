# Audio Processing

Process audio/video content through the complete 8-step pipeline to generate show notes, transcriptions, summaries, and optional media outputs.

## Endpoint

```
POST /api/process
```

## Description

Main processing endpoint that accepts either a URL or uploaded file path and creates a background processing job. Returns a job ID for polling status via the [Job Status](./jobs.md) endpoint.

The pipeline includes:

1. **Download & Audio Extraction** - Download/convert audio to 16kHz mono WAV
2. **Transcription** - Generate transcript using Groq Whisper, DeepInfra Whisper, or HappyScribe
3. **Prompt Selection** - Already selected via form (summaries, chapters, etc.)
4. **LLM Processing** - Generate show notes using selected GPT model
5. **Text-to-Speech** (optional) - Convert summary to audio
6. **Image Generation** (optional) - Create thumbnail/promotional images
7. **Music Generation** (optional) - Generate background music
8. **Video Generation** (optional) - Generate video clips with OpenAI Sora

## Request

**Content-Type:** `multipart/form-data`

**Form Fields:**

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `llmService` | string | No | LLM provider: `openai` (default), `anthropic`, `gemini` |
| `llmModel` | string | Yes | LLM model ID for the selected provider |
| `selectedPrompts` | string | Yes | Comma-separated list of content types to generate |

### Source Fields (One Required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Conditional | URL to process (if not using uploaded file) |
| `urlType` | string | Conditional | URL type from verify-url: `youtube`, `streaming`, `direct-file` |
| `urlDuration` | string | Optional | Duration in seconds (from verify-url) |
| `urlFileSize` | string | Optional | File size in bytes (from verify-url) |
| `uploadedFilePath` | string | Conditional | Server file path from upload/upload-chunk (if not using URL) |
| `uploadedFileName` | string | Conditional | Original filename (if using uploaded file) |

### Transcription Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transcriptionOption` | string | Yes | Service: `groq`, `deepinfra`, or `happyscribe` |
| `transcriptionModel` | string | Yes | Model for Groq/DeepInfra: `whisper-large-v3-turbo`, `whisper-large-v3` |

### Optional Features

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ttsEnabled` | string | No | Enable TTS: `"true"` or `"false"` (default: `"false"`) |
| `ttsService` | string | Conditional | TTS service (if enabled): `elevenlabs` or `openai` |
| `ttsVoice` | string | Conditional | Voice ID/name (if TTS enabled) |
| `imageGenEnabled` | string | No | Enable image generation: `"true"` or `"false"` (default: `"false"`) |
| `selectedImagePrompts` | string | Conditional | Comma-separated image prompts (if image gen enabled) |
| `musicGenSkipped` | string | No | Skip music generation: `"true"` or `"false"` (default: `"false"`) |
| `selectedMusicGenre` | string | Optional | Genre: `rap`, `rock`, `pop`, `country`, `folk`, `jazz` |
| `videoGenEnabled` | string | No | Enable video generation: `"true"` or `"false"` (default: `"false"`) |
| `selectedVideoPrompts` | string | Conditional | Comma-separated video types (if video gen enabled) |
| `videoModel` | string | Conditional | Video model: `sora-2` or `sora-2-pro` |
| `videoSize` | string | Conditional | Video size: `1920x1080`, `1080x1920`, `1280x720`, `720x1280` |
| `videoDuration` | string | Conditional | Video duration in seconds |

## Selected Prompts Options

**Summaries:**
- `shortSummary` - Brief overview
- `longSummary` - Detailed summary
- `bulletPoints` - Key points list
- `takeaways` - Main takeaways
- `faq` - Frequently asked questions

**Chapters:**
- `shortChapters` - Concise chapter breakdown
- `mediumChapters` - Standard chapter detail
- `longChapters` - Detailed chapter summaries

## Video Prompt Types

- `explainer` - Explainer video
- `highlight` - Highlight reel
- `intro` - Introduction video
- `outro` - Outro video
- `social` - Social media clip

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
- Routes to Groq Whisper, DeepInfra Whisper, or HappyScribe
- Segments audio if needed (Groq >10min)
- Generates timestamped transcript
- Saves `transcription.txt`

**Step 3: Prompt Selection (5% weight)**
- Builds prompt from selected content types
- Assembles instructions and examples
- Injects metadata and transcript

**Step 4: LLM Processing (20% weight)**
- Sends prompt to selected LLM provider (OpenAI GPT, Anthropic Claude, or Google Gemini)
- 30-minute timeout
- Generates markdown show notes
- Saves `summary.md`

**Step 5: Text-to-Speech (5% weight, optional)**
- Converts summary to audio
- Uses ElevenLabs or OpenAI TTS
- Saves audio file

**Step 6: Image Generation (5% weight, optional)**
- Generates images from selected prompts
- Uses OpenAI DALL-E
- Saves image files

**Step 7: Music Generation (5% weight, optional)**
- Generates background music
- Uses ElevenLabs Music
- Saves music file

**Step 8: Video Generation (13% weight, optional)**
- Generates video clips from selected prompts
- Uses OpenAI Sora (sora-2 or sora-2-pro)
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
formData.append('transcriptionModel', 'whisper-large-v3-turbo')
formData.append('llmModel', 'gpt-4o-mini')
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
  -F "transcriptionModel=whisper-large-v3-turbo" \
  -F "llmModel=gpt-4o-mini" \
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

2. **LLM Model:**
   - Required and must not be empty
   - Valid values: `gpt-4o`, `gpt-4o-mini`, `gpt-4o-2024-08-06`

3. **Selected Prompts:**
   - Must select at least one content type
   - Comma-separated, no spaces

4. **TTS Options:**
   - If `ttsEnabled=true`, must provide `ttsService` and `ttsVoice`

5. **Image Generation:**
   - If `imageGenEnabled=true`, must provide at least one `selectedImagePrompts`

6. **Video Generation:**
   - If `videoGenEnabled=true`, must provide at least one `selectedVideoPrompts`
   - Must also provide `videoModel`, `videoSize`, and `videoDuration`

7. **Transcription:**
   - `transcriptionOption` and `transcriptionModel` always required
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
- `summary.md` - Generated show notes
- `{ttsService}-summary.{ext}` - TTS audio (if enabled)
- `{prompt}-{timestamp}.png` - Generated images (if enabled)
- `music-{timestamp}.mp3` - Generated music (if enabled)
- `{promptType}-{timestamp}.mp4` - Generated videos (if enabled)

## Notes

- Processing runs in background after job creation
- Poll the [Job Status](./jobs.md) endpoint for progress updates
- Processing can take several minutes depending on audio length and selected features
- Errors stop processing immediately and update job status to `error`
- Successfully completed steps stored even if later steps fail
