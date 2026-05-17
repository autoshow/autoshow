# File Upload

```http
POST /api/download/upload
Content-Type: multipart/form-data
```

Uploads a local file in one request. No app session is required.

Field:

- `file`: audio, video, document, or supported image file

Security and limits:

- File size is enforced with `AUTOSHOW_MAX_UPLOAD_BYTES`.
- Empty files are rejected.
- IP rate limits apply when trusted proxy headers are configured.
- The response `uploadId` is the server-issued reference accepted by processing routes.

Example:

```bash
curl -X POST http://localhost:4321/api/download/upload \
  -F "file=@/path/to/audio.mp3"
```

Use the returned `uploadId` on `POST /api/process` or `POST /api/process/preview`.
