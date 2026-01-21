# Chunked File Upload

Upload large audio/video files in chunks for reliable transfer of files over 50MB.

## Endpoint

```
POST /api/upload-chunk
```

## Description

Multi-part chunked upload for large files. Splits files into smaller chunks (typically 5-10MB each) and uploads them sequentially. When all chunks are received, they are automatically assembled into the complete file.

## Request

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chunk` | File | Yes | Individual file chunk |
| `chunkIndex` | number | Yes | Zero-based index of this chunk (0, 1, 2, ...) |
| `totalChunks` | number | Yes | Total number of chunks for this file |
| `fileId` | string | Yes | Unique identifier for this upload session |
| `fileName` | string | Yes | Original filename |

## Response

**Status Codes:**
- `200` - Chunk received or file complete
- `400` - Invalid chunk parameters
- `500` - Upload failed

**Chunk Received Response (200):**

```json
{
  "complete": false,
  "uploadedChunks": 3,
  "totalChunks": 10
}
```

**Upload Complete Response (200):**

```json
{
  "complete": true,
  "filePath": "./uploads/1700654321000_large_video.mp4",
  "fileName": "large_video.mp4",
  "fileSize": 524288000
}
```

**Error Response (400):**

```json
{
  "error": "Invalid chunk upload request"
}
```

**Error Response (500):**

```json
{
  "error": "Failed to process chunk"
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `complete` | boolean | Whether all chunks have been received and assembled |
| `uploadedChunks` | number | Number of chunks successfully uploaded so far |
| `totalChunks` | number | Total expected chunks |
| `filePath` | string | Server-side path to assembled file (only when complete) |
| `fileName` | string | Original filename (only when complete) |
| `fileSize` | number | Total assembled file size in bytes (only when complete) |
| `error` | string | Error message if upload failed |

## Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Client                                                       │
└───┬─────────────────────────────────────────────────────────┘
    │
    ├─ 1. Generate unique fileId (UUID)
    ├─ 2. Split file into chunks (e.g., 5MB each)
    │
    ├─ 3. Upload chunk 0 ──────────────────────┐
    │                                           │
    │   POST /api/upload-chunk                  │
    │   - chunk: Blob (5MB)                     ▼
    │   - chunkIndex: 0                  ┌──────────────┐
    │   - totalChunks: 10                │   Server     │
    │   - fileId: "abc-123"              │              │
    │   - fileName: "video.mp4"          │ Saves chunk  │
    │                                    │ to temp dir  │
    │   ◀── { complete: false,           └──────────────┘
    │        uploadedChunks: 1,
    │        totalChunks: 10 }
    │
    ├─ 4. Upload chunk 1 (repeat for each chunk)
    ├─ 5. Upload chunk 2
    │   ...
    │
    ├─ 10. Upload chunk 9 (final) ─────────────┐
    │                                           │
    │   POST /api/upload-chunk                  ▼
    │   - chunk: Blob (3MB)              ┌──────────────┐
    │   - chunkIndex: 9                  │   Server     │
    │   - totalChunks: 10                │              │
    │   - fileId: "abc-123"              │ 1. Assembles │
    │   - fileName: "video.mp4"          │    all chunks│
    │                                    │ 2. Deletes   │
    │   ◀── { complete: true,            │    temp files│
    │        filePath: "./uploads/...",  │ 3. Returns   │
    │        fileName: "video.mp4",      │    final path│
    │        fileSize: 52428800 }        └──────────────┘
    │
    └─ 11. Use filePath in /api/process request
```

## Example Client Implementation (JavaScript)

```javascript
async function uploadLargeFile(file) {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  const fileId = crypto.randomUUID()
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)
    
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkIndex', i.toString())
    formData.append('totalChunks', totalChunks.toString())
    formData.append('fileId', fileId)
    formData.append('fileName', file.name)
    
    const response = await fetch('/api/upload-chunk', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (result.complete) {
      console.log('Upload complete:', result.filePath)
      return result
    } else {
      console.log(`Uploaded ${result.uploadedChunks}/${result.totalChunks}`)
    }
  }
}

// Usage
const fileInput = document.getElementById('file-input')
const file = fileInput.files[0]
const result = await uploadLargeFile(file)
```

## Example using curl

```bash
# Upload chunk 0
curl -X POST http://localhost:4321/api/upload-chunk \
  -F "chunk=@chunk_0.bin" \
  -F "chunkIndex=0" \
  -F "totalChunks=10" \
  -F "fileId=abc-123" \
  -F "fileName=video.mp4"

# Upload chunk 1
curl -X POST http://localhost:4321/api/upload-chunk \
  -F "chunk=@chunk_1.bin" \
  -F "chunkIndex=1" \
  -F "totalChunks=10" \
  -F "fileId=abc-123" \
  -F "fileName=video.mp4"

# ... continue for all chunks
```

## Chunk Assembly Process

1. Each chunk stored in `./uploads/chunks/{fileId}/chunk_{index}`
2. Server tracks received chunks
3. When all chunks received:
   - Creates final file at `./uploads/{timestamp}_{fileName}`
   - Reads and writes chunks sequentially
   - Deletes temporary chunk files and directory
   - Returns final file metadata

## Notes

- Chunks must be uploaded with consistent `fileId` and `totalChunks`
- Chunks can be uploaded in any order
- Server automatically detects completion when all chunks present
- Temporary chunk directory cleaned up after assembly
- Recommended chunk size: 5-10MB
- No timeout on upload sessions (chunks can be uploaded over time)
- If upload fails midway, restart from chunk 0 with new `fileId`
