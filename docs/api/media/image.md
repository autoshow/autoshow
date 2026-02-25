# Image File Serving

Serve generated image files from AI image generation.

## Outline

- [Endpoint](#endpoint)
- [Description](#description)
- [Request](#request)
- [Response](#response)
- [Supported Image Formats](#supported-image-formats)
- [File Path Resolution](#file-path-resolution)
- [Examples](#examples)
- [Caching](#caching)
- [Security](#security)
- [Notes](#notes)

## Endpoint

```
GET /api/media/image/{showNoteId}/{fileName}
```

## Description

Serves image files from processed show notes with proper content types and caching headers.

## Request

**Path Parameters:**

| Parameter    | Type   | Required | Description                                   |
|--------------|--------|----------|-----------------------------------------------|
| `showNoteId` | string | Yes      | Show note ID                                  |
| `fileName`   | string | Yes      | Image filename (can include subdirectories)   |

## Response

**Status Codes:**
- `200` - File served successfully
- `400` - Invalid path
- `404` - File not found
- `500` - Server error

**Success Response (200):**

Binary image data with appropriate headers.

**Headers:**

| Header           | Value                      | Description                       |
|------------------|----------------------------|-----------------------------------|
| `Content-Type`   | `image/*`                  | MIME type based on file extension |
| `Content-Length` | number                     | File size in bytes                |
| `Cache-Control`  | `public, max-age=31536000` | Cache for 1 year                  |
| `Accept-Ranges`  | `bytes`                    | Supports range requests           |

**Error Response (400):**

```
Invalid path
```

**Error Response (404):**

```
Image file not found
```

**Error Response (500):**

```
Internal server error
```

## Supported Image Formats

| Extension        | MIME Type     |
|------------------|---------------|
| `.png`           | `image/png`   |
| `.jpg` / `.jpeg` | `image/jpeg`  |
| `.webp`          | `image/webp`  |
| `.gif`           | `image/gif`   |

Default: `image/png`

## File Path Resolution

Files served from: `./output/{showNoteId}/{fileName}`

Examples:
- `/api/media/image/abc-123/image_thumbnail.png` → `./output/abc-123/image_thumbnail.png`
- `/api/media/image/abc-123/image_keyMoment.png` → `./output/abc-123/image_keyMoment.png`
- `/api/media/image/xyz-789/video_highlight_thumb.webp` → `./output/xyz-789/video_highlight_thumb.webp`

## Examples

**Basic Request:**

```bash
curl http://localhost:4321/api/media/image/abc-123/image_thumbnail.png > thumbnail.png
```

**HTML Image Element:**

```html
<img src="/api/media/image/abc-123/image_thumbnail.png" alt="Thumbnail">
```

**JavaScript Fetch:**

```javascript
async function loadImage(showNoteId, fileName) {
  const response = await fetch(`/api/media/image/${showNoteId}/${fileName}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  
  const img = document.createElement('img')
  img.src = url
  document.body.appendChild(img)
}

loadImage('abc-123', 'image_thumbnail.png')
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

- Generated images come from the selected image provider and model
- Default image format is PNG; size or aspect ratio depends on the service config
- Video thumbnails (`.webp`) can also be served through this endpoint
- No access control (files are public)
