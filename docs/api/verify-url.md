# URL Verification

Verify and extract metadata from audio/video URLs before processing.

## Endpoint

```
POST /api/verify-url
```

## Description

Validates URL format, detects content type (YouTube, streaming platform, or direct file), and retrieves metadata like duration and file size. Required before submitting URLs to the processing pipeline.

## Request

**Content-Type:** `application/json`

**Body:**

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to verify (YouTube, streaming platform, or direct audio/video file) |

## Response

**Status Codes:**
- `200` - URL verified successfully
- `400` - Invalid or missing URL
- `500` - Verification failed

**Success Response - YouTube (200):**

```json
{
  "urlType": "youtube",
  "duration": 212,
  "durationFormatted": "3m 32s"
}
```

**Success Response - Direct File (200):**

```json
{
  "urlType": "direct-file",
  "duration": 1847,
  "durationFormatted": "30m 47s",
  "fileSize": 29384756,
  "fileSizeFormatted": "28.03 MB",
  "mimeType": "audio/mpeg"
}
```

**Success Response - Other Streaming (200):**

```json
{
  "urlType": "streaming",
  "duration": 3665,
  "durationFormatted": "1h 1m 5s",
  "fileSize": 524288000,
  "fileSizeFormatted": "500.00 MB"
}
```

**Error Response (400):**

```json
{
  "error": "Invalid URL or unsupported format"
}
```

**Error Response (500):**

```json
{
  "error": "Failed to verify URL"
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `urlType` | string | Detected URL type: `youtube`, `streaming`, `direct-file`, or `invalid` |
| `duration` | number | Duration in seconds (optional, if available) |
| `durationFormatted` | string | Human-readable duration (e.g., "1h 5m 30s") |
| `fileSize` | number | File size in bytes (optional, for direct files) |
| `fileSizeFormatted` | string | Human-readable file size (e.g., "150.25 MB") |
| `mimeType` | string | Content MIME type (optional, for direct files) |
| `error` | string | Error message if verification failed |

## URL Types

**YouTube (`youtube`):**
- Patterns: `youtube.com/watch`, `youtu.be/`
- Metadata: YouTube API v3 for duration
- Requires: `YOUTUBE_API_KEY` environment variable

**Streaming (`streaming`):**
- Patterns: `vimeo.com`, `twitch.tv`, `dailymotion.com`, `facebook.com/watch`, `soundcloud.com`
- Metadata: `yt-dlp` for duration and file size
- Requires: `yt-dlp` installed

**Direct File (`direct-file`):**
- Extensions: `.mp3`, `.mp4`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.webm`, `.mpeg`, `.mpga`, `.avi`, `.mov`, `.mkv`, `.aac`, `.wma`
- Metadata: `curl` for headers, `ffprobe` for duration
- Requires: `curl` and `ffmpeg`/`ffprobe` installed

## Examples

**Verify YouTube URL:**

```bash
curl -X POST http://localhost:4321/api/verify-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Verify Direct Audio File:**

```bash
curl -X POST http://localhost:4321/api/verify-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/podcast.mp3"}'
```

**Verify Vimeo Video:**

```bash
curl -X POST http://localhost:4321/api/verify-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vimeo.com/123456789"}'
```

## Notes

- YouTube verification requires valid `YOUTUBE_API_KEY`
- Direct file metadata extraction is best-effort; some servers may not provide all information
- Streaming platform support depends on `yt-dlp` capabilities
- Invalid URLs return `urlType: "invalid"` with error message
- Duration and file size are optional; may be unavailable for some URLs
- Verification does not download content, only metadata
