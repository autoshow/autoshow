# API Reference

Complete API documentation for the Autoshow application's HTTP endpoints.

---

## Base URL

```
http://localhost:4321/api
```

For production deployments, replace with your domain.

---

## Available Endpoints

1. [Health Check](./health.md) - `GET /api/health`
2. [URL Verification](./download/verify-url.md) - `POST /api/download/verify-url`
3. [File Upload](./download/upload.md) - `POST /api/download/upload`
4. [Chunked File Upload](./download/upload-chunk.md) - `POST /api/download/upload-chunk`
5. [Audio Processing](./process.md) - `POST /api/process`
6. [Job Status](./jobs.md) - `GET /api/jobs/{id}`
7. [Audio File Serving](./media/audio.md) - `GET /api/media/audio/{showNoteId}/{fileName}`
8. [Image File Serving](./media/image.md) - `GET /api/media/image/{showNoteId}/{fileName}`
9. [Video File Serving](./media/video.md) - `GET /api/media/video/{showNoteId}/{fileName}`

---

## Error Handling

All endpoints follow consistent error response patterns:

### Standard Error Response

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code  | Meaning               | When Used                                |
|-------|-----------------------|------------------------------------------|
| `200` | OK                    | Request successful                       |
| `206` | Partial Content       | Range request served                     |
| `400` | Bad Request           | Invalid parameters or validation failure |
| `404` | Not Found             | Resource doesn't exist                   |
| `500` | Internal Server Error | Server-side error                        |
| `503` | Service Unavailable   | Health check failed (degraded state)     |

### Common Error Scenarios

**Missing Required Field:**
```json
{
  "error": "LLM model is required"
}
```

**Invalid Input:**
```json
{
  "error": "Invalid URL or unsupported format"
}
```

**Service Unavailable:**
```json
{
  "error": "Groq API quota exceeded"
}
```

**File Not Found:**
```json
{
  "error": "Audio file not found"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider implementing:

- Request rate limits per IP
- Processing queue limits
- Concurrent processing limits

---

## Access

All endpoints are public.

For production deployments, consider:

- API keys
- signed requests
- scoped service tokens

---

## CORS

CORS headers should be configured based on deployment environment.

Recommended production settings:
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type
```

---

## Webhooks

No webhook functionality currently implemented.

Potential future additions:
- Processing completion webhooks
- Error notification webhooks
- Progress update webhooks

---

## API Versioning

Current API version: **v1** (implicit, no version in URL)

For future versions, consider:
- URL versioning: `/api/v2/process`
- Header versioning: `Accept: application/vnd.autoshow.v2+json`

---

## Environment Variables

Required environment variables for API functionality:

### Required

| Variable             | Description                                              | Used By        |
|----------------------|----------------------------------------------------------|----------------|
| `GROQ_API_KEY`       | Groq API key for Whisper transcription                   | `/api/process` |
| `DEEPINFRA_API_KEY`  | DeepInfra API key for Whisper transcription (alternative to Groq) | `/api/process` |
| `FAL_API_KEY`        | Fal API key for Whisper transcription with diarization   | `/api/process` |
| `OPENAI_API_KEY`     | OpenAI API key for GPT models                            | `/api/process` |
| `ANTHROPIC_API_KEY`  | Anthropic API key for Claude models                      | `/api/process` |
| `GEMINI_API_KEY`     | Google API key for Gemini models                         | `/api/process` |

### Optional

| Variable               | Description                                        | Used By                       |
|------------------------|----------------------------------------------------|-------------------------------|
| `YOUTUBE_API_KEY`      | YouTube API v3 key for video metadata              | `/api/download/verify-url`    |
| `HAPPYSCRIBE_API_KEY`  | HappyScribe API key for transcription              | `/api/process`                |
| `ELEVENLABS_API_KEY`   | ElevenLabs API key for TTS/music                   | `/api/process`                |
| `DATABASE_URL`         | SQLite database URL (default: `sqlite://./data/autoshow.db`) | `/api/health`, `/api/process` |
| `NODE_ENV`             | Environment: `development`, `production`, `test`   | `/api/health`                 |

---

## Best Practices

### Processing Workflow

1. **Health Check** - Verify services are available
2. **URL Verification** - Validate and get metadata before processing
3. **File Upload** - Use chunked upload for large files
4. **Processing** - Monitor SSE stream for progress
5. **Error Handling** - Handle disconnections and retries

### Example Complete Flow

```javascript
// 1. Health check
const health = await fetch('/api/health').then(r => r.json())
if (health.status !== 'healthy') {
  console.error('Service unavailable')
  return
}

// 2. Verify URL
const urlCheck = await fetch('/api/download/verify-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/video' })
}).then(r => r.json())

if (urlCheck.error) {
  console.error('Invalid URL:', urlCheck.error)
  return
}

// 3. Start Processing (returns job ID)
const formData = new FormData()
formData.append('url', 'https://example.com/video')
formData.append('urlType', urlCheck.urlType)
formData.append('urlDuration', urlCheck.duration.toString())
formData.append('transcriptionOption', 'groq')
formData.append('transcriptionModel', 'whisper-large-v3-turbo')
formData.append('llmService', 'openai')
formData.append('llmModel', 'gpt-5.2')
formData.append('selectedPrompts', 'shortSummary,shortChapters')
formData.append('ttsEnabled', 'false')
formData.append('imageGenEnabled', 'false')
formData.append('musicGenSkipped', 'true')
formData.append('videoGenEnabled', 'false')

const { jobId } = await fetch('/api/process', {
  method: 'POST',
  body: formData
}).then(r => r.json())

// 4. Poll for job status
const pollInterval = setInterval(async () => {
  const job = await fetch(`/api/jobs/${jobId}`).then(r => r.json())
  
  console.log(`Step ${job.currentStep}: ${job.stepName}`)
  console.log(`Progress: ${job.overallProgress}%`)
  
  if (job.status === 'error') {
    console.error('Processing error:', job.error)
    clearInterval(pollInterval)
    return
  }
  
  if (job.status === 'completed') {
    console.log('Complete! Show Note ID:', job.showNoteId)
    clearInterval(pollInterval)
    window.location.href = `/show-notes/${job.showNoteId}`
  }
}, 2000) // Poll every 2 seconds
```

---

## Support

For issues and questions:
- GitHub: [ajcwebdev/autoshow-bun](https://github.com/ajcwebdev/autoshow-bun)
- Documentation: `/docs/` directory
- Database Schema: `docs/Database.md`
- Processing Pipeline: `docs/StepOverview.md`

---

## Changelog

### Version 1.1.0 (Current)
- Job-based processing with polling endpoint
- Video generation support (Step 8) with OpenAI Sora
- Audio processing pipeline (8 steps)

### Version 1.0.0
- Initial API implementation
- Health check endpoint
- URL verification with YouTube API
- File upload (single and chunked)
- Audio processing pipeline (7 steps)
- Audio file serving
- SQLite database integration
- Server-Sent Events for progress tracking
