# Audio File Serving

Serve generated audio files (TTS output, original audio, music).

## Endpoint

```
GET /api/audio/{showNoteId}/{fileName}
```

## Description

Serves audio files from processed show notes with proper content types and caching headers. Supports range requests for seeking.

## Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `showNoteId` | string | Yes | Show note ID |
| `fileName` | string | Yes | Audio filename (can include subdirectories) |

**Headers:**

| Header | Description |
|--------|-------------|
| `Range` | Optional: Request specific byte range (e.g., `bytes=0-1023`) |

## Response

**Status Codes:**
- `200` - File served successfully
- `206` - Partial content (range request)
- `400` - Invalid path
- `404` - File not found
- `500` - Server error

**Success Response (200):**

Binary audio data with appropriate headers.

**Headers:**

| Header | Value | Description |
|--------|-------|-------------|
| `Content-Type` | `audio/*` | MIME type based on file extension |
| `Content-Length` | number | File size in bytes |
| `Cache-Control` | `public, max-age=31536000` | Cache for 1 year |
| `Accept-Ranges` | `bytes` | Supports range requests |

**Error Response (400):**

```
Invalid path
```

**Error Response (404):**

```
Audio file not found
```

**Error Response (500):**

```
Internal server error
```

## Supported Audio Formats

| Extension | MIME Type |
|-----------|-----------|
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.ogg` | `audio/ogg` |
| `.m4a` | `audio/mp4` |

Default: `audio/wav`

## File Path Resolution

Files served from: `./output/{showNoteId}/{fileName}`

Examples:
- `/api/audio/abc-123/audio.wav` → `./output/abc-123/audio.wav`
- `/api/audio/abc-123/elevenlabs-summary.mp3` → `./output/abc-123/elevenlabs-summary.mp3`
- `/api/audio/xyz-789/music/generated-music.mp3` → `./output/xyz-789/music/generated-music.mp3`

## Examples

**Basic Request:**

```bash
curl http://localhost:4321/api/audio/abc-123/audio.wav > output.wav
```

**Range Request (seeking):**

```bash
curl -H "Range: bytes=0-1023" \
  http://localhost:4321/api/audio/abc-123/elevenlabs-summary.mp3
```

**HTML5 Audio Player:**

```html
<audio controls>
  <source src="/api/audio/abc-123/audio.wav" type="audio/wav">
  Your browser does not support the audio element.
</audio>
```

**JavaScript Fetch:**

```javascript
async function playAudio(showNoteId, fileName) {
  const response = await fetch(`/api/audio/${showNoteId}/${fileName}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  
  const audio = new Audio(url)
  audio.play()
}

playAudio('abc-123', 'elevenlabs-summary.mp3')
```

## Caching

- Files cached for 1 year (`max-age=31536000`)
- Public caching allowed
- Suitable for CDN distribution
- Files are immutable (show note ID + filename combination unique)

## Security

- Path traversal prevented (validated against output directory)
- Only serves files from `./output/` directory
- Show note ID and filename validated

## Notes

- Supports range requests for audio seeking in players
- Large files efficiently served via streaming
- No authentication/authorization (files are public)
- Files must exist in show note output directory
- Subdirectories supported in filename path
