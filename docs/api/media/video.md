# Video File Serving

Serve generated video files from AI video generation.

## Outline

- [Endpoint](#endpoint)
- [Description](#description)
- [Request](#request)
- [Response](#response)
- [Supported Video Formats](#supported-video-formats)
- [File Path Resolution](#file-path-resolution)
- [Examples](#examples)
- [Caching](#caching)
- [Security](#security)
- [Notes](#notes)

## Endpoint

```
GET /api/media/video/{showNoteId}/{fileName}
```

## Description

Serves video files from processed show notes with proper content types and caching headers.

## Request

**Path Parameters:**

| Parameter    | Type   | Required | Description                                   |
|--------------|--------|----------|-----------------------------------------------|
| `showNoteId` | string | Yes      | Show note ID                                  |
| `fileName`   | string | Yes      | Video filename (can include subdirectories)   |

## Response

**Status Codes:**
- `200` - File served successfully
- `400` - Invalid path
- `404` - File not found
- `500` - Server error

**Success Response (200):**

Binary video data with appropriate headers.

**Headers:**

| Header           | Value                      | Description                       |
|------------------|----------------------------|-----------------------------------|
| `Content-Type`   | `video/*`                  | MIME type based on file extension |
| `Content-Length` | number                     | File size in bytes                |
| `Cache-Control`  | `public, max-age=31536000` | Cache for 1 year                  |
| `Accept-Ranges`  | `bytes`                    | Supports range requests           |

**Error Response (400):**

```
Invalid path
```

**Error Response (404):**

```
Video file not found
```

**Error Response (500):**

```
Internal server error
```

## Supported Video Formats

| Extension | MIME Type         |
|-----------|-------------------|
| `.mp4`    | `video/mp4`       |
| `.webm`   | `video/webm`      |
| `.mov`    | `video/quicktime` |

Default: `video/mp4`

## File Path Resolution

Files served from: `./output/{showNoteId}/{fileName}`

Examples:
- `/api/media/video/abc-123/video_explainer.mp4` → `./output/abc-123/video_explainer.mp4`
- `/api/media/video/abc-123/video_highlight.mp4` → `./output/abc-123/video_highlight.mp4`
- `/api/media/video/xyz-789/video_intro.mp4` → `./output/xyz-789/video_intro.mp4`

## Examples

**Basic Request:**

```bash
curl http://localhost:4321/api/media/video/abc-123/video_explainer.mp4 > video.mp4
```

**HTML5 Video Player:**

```html
<video controls>
  <source src="/api/media/video/abc-123/video_explainer.mp4" type="video/mp4">
  Your browser does not support the video element.
</video>
```

**JavaScript Fetch:**

```javascript
async function loadVideo(showNoteId, fileName) {
  const response = await fetch(`/api/media/video/${showNoteId}/${fileName}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  
  const video = document.createElement('video')
  video.src = url
  video.controls = true
  document.body.appendChild(video)
}

loadVideo('abc-123', 'video_explainer.mp4')
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

- Generated videos are created by OpenAI's Sora model (sora-2 or sora-2-pro)
- Available video sizes: 1920x1080, 1080x1920, 1280x720, 720x1280
- Available durations: 5s, 10s, 15s, 20s
- No access control (files are public)
- Video thumbnails are served via the `/api/media/image/` endpoint as `.webp` files
