# File Upload

Upload local audio/video files for processing (single request, files up to ~50MB).

## Outline

- [Endpoint](#endpoint)
- [Description](#description)
- [Request](#request)
- [Response](#response)
- [Fields](#fields)
- [Example](#example)
- [Upload Process](#upload-process)
- [Notes](#notes)

## Endpoint

```
POST /api/download/upload
```

## Description

Direct file upload for smaller files. For files larger than ~50MB, use the [Chunked File Upload](./upload-chunk.md) endpoint instead.

## Request

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field  | Type | Required | Description                    |
|--------|------|----------|--------------------------------|
| `file` | File | Yes      | Audio or video file to upload  |

## Response

**Status Codes:**
- `200` - File uploaded successfully
- `400` - No file provided
- `500` - Upload failed

**Success Response (200):**

```json
{
  "success": true,
  "filePath": "./uploads/1700654321000_podcast_episode.mp3",
  "fileName": "podcast_episode.mp3",
  "fileSize": 45678901,
  "duration": 1847
}
```

**Error Response (400):**

```json
{
  "error": "No file provided or invalid file type"
}
```

**Error Response (500):**

```json
{
  "error": "Failed to upload file"
}
```

## Fields

| Field      | Type    | Description                                                    |
|------------|---------|----------------------------------------------------------------|
| `success`  | boolean | Upload success status                                          |
| `filePath` | string  | Server-side path to uploaded file (use in processing request)  |
| `fileName` | string  | Original filename                                              |
| `fileSize` | number  | File size in bytes                                             |
| `duration` | number  | Duration in seconds (optional, if detectable)                  |
| `error`    | string  | Error message if upload failed                                 |

## Example

```bash
curl -X POST http://localhost:4321/api/download/upload \
  -F "file=@/path/to/audio.mp3"
```

## Upload Process

1. File is sanitized (special characters replaced with `_`)
2. Timestamp prefix added to prevent collisions
3. Stored in `./uploads/` directory
4. Returns server path for use in processing request

## Notes

- Maximum file size depends on server configuration
- Files are named: `{timestamp}_{sanitized_filename}`
- Upload directory created automatically if it doesn't exist
- Original filename preserved in response
- For large files (>50MB), use chunked upload endpoint
