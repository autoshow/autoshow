# Chunked Upload

```http
POST /api/download/upload-chunk
Content-Type: multipart/form-data
```

Uploads a large file in chunks and assembles it server-side. No app session is required.

Fields:

- `chunk`
- `chunkIndex`
- `totalChunks`
- `fileId`
- `fileName`

Limits:

- `AUTOSHOW_MAX_UPLOAD_CHUNK_BYTES`
- `AUTOSHOW_MAX_UPLOAD_CHUNKS`
- `AUTOSHOW_MAX_UPLOAD_BYTES`
- `AUTOSHOW_MAX_CONCURRENT_GLOBAL_UPLOADS`
- `AUTOSHOW_UPLOAD_TTL_MS`

`fileId` is sanitized and used as the chunk-upload id. Choose unique ids on the client when running concurrent uploads.
