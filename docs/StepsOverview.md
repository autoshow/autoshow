# Autoshow Complete Workflow Overview

## Architecture

Eight-step linear pipeline that transforms multimedia input into multi-format content output. Each step produces outputs consumed by subsequent steps. Steps 1-4 are required, steps 5-8 are optional.

## Complete Workflow

### High-Level Pipeline

```
Input -> Step 1 -> Step 2 -> Step 3 -> Step 4 -> Step 5 -> Step 6 -> Step 7 -> Step 8 -> Output
         (Audio)  (Text)   (Config) (Summary) (Audio) (Images) (Music)  (Video)
```

For detailed architecture diagrams, progress tracking, and service selection flow charts, see [StepsDiagram.md](./StepsDiagram.md).

---

## Step 1: Download & Audio Extraction

**Location**: `src/process-options/`

**Input Routing**:
- Local files -> `processFile()` -> ffmpeg conversion to WAV
- Direct URLs -> `processDirectUrl()` -> curl download + ffmpeg conversion
- Streaming URLs -> `processVideo()` -> HappyScribe direct processing (no local audio)

**Processing**:
```typescript
// Local/Direct paths converge to:
ffmpeg -> 16kHz mono PCM WAV
```

**Output**: `audio.wav`, `metadata.json` (title, author, duration, fileSize) - for local/direct only

---

## Step 2: Transcription

**Location**: `src/process-steps/02-run-transcribe/`

**Service Selection**:
```typescript
// Streaming URLs REQUIRE HappyScribe
if (options.transcriptionService !== 'happyscribe') {
  throw new Error('Invalid transcription service for video URL. Please use HappyScribe.')
}

// Local/Direct URLs use Groq Whisper
if (duration > 600) splitAudioFile() // 10-minute chunks
await transcribeWithGroq()
```

**Groq Flow**: Audio -> curl download (if URL) -> API -> Parse segments -> `[HH:MM:SS]` timestamps

**HappyScribe Flow**: URL -> Create job -> Poll status -> Create export -> Poll export -> Download JSON -> Parse speakers

**Output**: `transcription.txt` with timestamped segments
```
[00:00:05] First segment text
[00:00:15] [Speaker 1] Second segment text
```

---

## Step 3: Content Selection

**Location**: `src/process-steps/03-select-prompts/`

**Available Options**:
- Summaries: `shortSummary`, `longSummary`, `bulletPoints`, `takeaways`, `faq`
- Chapters: `shortChapters`, `mediumChapters`, `longChapters`

**Processing**:
```typescript
// build-prompt.ts
const baseInstructions = `This is a transcript with timestamps...`

const selectedInstructions = selectedPrompts
  .map(prompt => PROMPT_SECTIONS[prompt]?.instruction)
  .filter(Boolean)
  .join('\n')

const fullPrompt = `${instructions}

Video Title: ${metadata.title}
Video URL: ${metadata.url}

Transcript:
${transcriptWithTimestamps}`
```

**Output**: Configuration array passed to Step 4 (no file written in this step)

---

## Step 4: LLM Text Generation

**Location**: `src/process-steps/04-run-llm/`

**Providers**: OpenAI (GPT-5 series), Anthropic (Claude 4.5 series), or Google (Gemini 3 series)

**Flow**:
```typescript
// run-llm.ts
const fullPrompt = buildPrompt(metadata, transcription, selectedPrompts)
await writeFile(`${outputDir}/prompt.md`, fullPrompt)

const controller = new AbortController()
setTimeout(() => controller.abort(), 1800000) // 30 min timeout

const response = await client.responses.create({
  model,
  input: fullPrompt,
  stream: false
}, { signal: controller.signal })

await writeFile(`${outputDir}/summary.md`, response.output_text)
```

**Output**: `prompt.md`, `summary.md`, metadata (tokens, processing time)

---

## Step 5: Text-to-Speech (Optional)

**Location**: `src/process-steps/05-run-tts/`

**OpenAI**:
```typescript
// run-openai-tts.ts
const response = await client.audio.speech.create({
  model: 'gpt-4o-mini-tts',
  voice: voice, // default: 'coral'
  input: text,
  response_format: 'wav',
  ...(instructions && { instructions })
})
await Bun.write(`${outputDir}/speech.wav`, Buffer.from(await response.arrayBuffer()))
```

**ElevenLabs**:
```typescript
// run-elevenlabs-tts.ts
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
  method: 'POST',
  body: JSON.stringify({ 
    text, 
    model_id: 'eleven_flash_v2_5', 
    output_format: 'mp3_44100_128' 
  })
})
await Bun.write(`${outputDir}/speech.mp3`, Buffer.from(await response.arrayBuffer()))
```

**Output**: `speech.wav` or `speech.mp3`, duration via `ffprobe`

---

## Step 6: AI Image Generation (Optional)

**Location**: `src/process-steps/06-run-image/`

**Image Types**: `keyMoment`, `thumbnail`, `conceptual`, `infographic`, `character`, `quote` (select 1-3)

**Flow**:
```typescript
// run-chatgpt-image.ts
for (const promptType of selectedPrompts) {
  const prompt = IMAGE_PROMPT_TEMPLATES[promptType]
    .replace('{title}', title)
    .replace('{summary}', summary)
  
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    quality: 'high'
  })
  
  const buffer = Buffer.from(response.data[0].b64_json, 'base64')
  await Bun.write(`${outputDir}/image_${promptType}.png`, buffer)
}
```

**Output**: `image_{type}.png` (1-3 files, 1024x1024 PNG)

---

## Step 7: Music Generation (Optional)

**Location**: `src/process-steps/07-run-music/`

**Phase 1: Lyrics**
```typescript
// run-music.ts
const lyricsPrompt = buildLyricsPrompt(metadata, transcription, genre)
await Bun.write(`${outputDir}/music-lyrics-prompt.md`, lyricsPrompt)

const { response: lyrics } = await runOpenAIModel(lyricsPrompt, llmModel)
await Bun.write(`${outputDir}/music-lyrics.txt`, lyrics)
```

**Phase 2: Composition**
```typescript
// run-elevenlabs-music.ts
const genreEnhancement = getGenrePromptEnhancement(genre)
const prompt = `Create a ${genre} song ${genreEnhancement}. Use the following lyrics:\n\n${lyrics}`

const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY })

const audioStream = await client.music.compose({
  prompt,
  modelId: 'music_v1',
  musicLengthMs: 180000 // 3 minutes
})

// Stream to buffer and write
const chunks = await streamToBuffer(audioStream)
await Bun.write(`${outputDir}/music.mp3`, Buffer.concat(chunks))
```

**Genres**: `rap`, `rock`, `pop`, `country`, `folk`, `jazz`

**Output**: `music-lyrics-prompt.md`, `music-lyrics.txt`, `music.mp3`

---

## Step 8: Video Generation (Optional)

**Location**: `src/process-steps/08-run-video/`

**Video Types**: `explainer`, `highlight`, `intro`, `outro`, `social`

**Phase 1: Scene Description**
```typescript
// run-video.ts
const scenePrompt = buildVideoScenePrompt(metadata, transcription, videoType, size, duration)
await Bun.write(`${outputDir}/video-scene-${videoType}.md`, scenePrompt)

const { response: sceneDescription } = await runOpenAIModel(scenePrompt, llmModel)
await Bun.write(`${outputDir}/video-scene-description-${videoType}.md`, sceneDescription)
```

**Phase 2: Video Rendering**
```typescript
// run-sora-video.ts
const safePrompt = wrapWithSafetyPrefix(sceneDescription)

// Create video job
const response = await fetch('https://api.openai.com/v1/videos', {
  method: 'POST',
  body: JSON.stringify({
    model,        // 'sora-2' or 'sora-2-pro'
    prompt: safePrompt,
    size,         // '1920x1080', '1080x1920', '1280x720', '720x1280'
    seconds: String(duration)
  })
})

// Poll for completion (up to 10 minutes)
await pollVideoStatus(job.id, progressTracker, ...)

// Download video and thumbnail
await downloadVideoContent(job.id, videoPath, 'video')
await downloadVideoContent(job.id, thumbnailPath, 'thumbnail')
```

**Models**: `sora-2`, `sora-2-pro`
**Sizes**: `1920x1080`, `1080x1920`, `1280x720`, `720x1280`

**Output**: `video-scene-{type}.md`, `video-scene-description-{type}.md`, `video_{type}.mp4`, `video_{type}_thumb.webp`

---

## Data Flow

**Core Pipeline** (Steps 1-4):
```
Input -> audio.wav + metadata -> transcription.txt -> config array -> summary.md
```

**Optional Extensions** (Steps 5-8):
```
summary.md -> speech.wav/mp3
summary.md -> image_*.png (1-3)
summary.md + transcription.txt -> music-lyrics.txt -> music.mp3
summary.md + transcription.txt -> video-scene-*.md -> video_*.mp4
```

## Output Directory

```
./output/{timestamp}/
+- audio.wav                         (local/direct only)
+- metadata.json
+- transcription.txt
+- prompt.md
+- summary.md
+- speech.wav/mp3                    (optional)
+- image_{type}.png                  (optional, 1-3)
+- music-lyrics-prompt.md            (optional)
+- music-lyrics.txt                  (optional)
+- music.mp3                         (optional)
+- video-scene-{type}.md             (optional)
+- video-scene-description-{type}.md (optional)
+- video_{type}.mp4                  (optional)
+- video_{type}_thumb.webp           (optional)
```

## Progress Tracking

**Implementation**: `src/types/progress.ts` (interface definition)

```typescript
interface ProgressUpdate {
  step: number,
  stepName: string,
  stepProgress: number,
  overallProgress: number,
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped',
  message: string,
  subStep?: { current: number, total: number, description?: string },
  error?: string,
  showNoteId?: string
}
```

Updates delivered via job-based polling system.

## Entry Points

**Main Process**: `src/routes/api/process.ts`
```typescript
// Creates a job and processes in background
const jobId = generateJobId()
createJob(db, jobId, { status: 'pending', inputData: JSON.stringify(options) })
processJobInBackground(jobId, options)
return Response.json({ jobId })
```

**Processing Dispatch**: `src/process-options/`
```typescript
// Route based on input type
if (options.isLocalFile) return await processFile(options, progressTracker)
if (options.urlType === 'direct-file') return await processDirectUrl(options, progressTracker)
return await processVideo(options, progressTracker) // Streaming URLs
```

**Routes**:
- `/api/upload` - Small file upload
- `/api/upload-chunk` - Chunked upload
- `/api/process` - Main processing endpoint (creates job)
- `/api/jobs/[id]` - Job status polling
