# API Reference

Reference documentation for the AutoShow HTTP API.

## Base URL

```text
http://localhost:4321/api
```

Use your deployment domain in production.

## Access Model

AutoShow is a local/global app. All app data is reachable to anyone who can reach the server.

Anyone who can reach the app can create, view, append to, and delete local app data. Keep network access restricted when running it with real provider keys.

## Security Controls

- Provider API keys remain server-side.
- Google Drive import still requires a Google access token for the selected Drive file.
- S3/private object downloads use server-side object-key validation and signed/streamed responses.
- URL inputs are validated as public HTTP(S) targets.
- Upload and URL verification endpoints use IP rate limits when trusted proxy headers are configured.

## Endpoints

- `GET /api/health`
- `POST /api/download/verify-url`
- `POST /api/download/upload`
- `POST /api/download/upload-chunk`
- `POST /api/download/complete-upload`
- `POST /api/download/google-drive/import`
- `POST /api/process/preview`
- `POST /api/process`
- `GET /api/jobs/{id}`
- `GET /api/media/audio/{showNoteId}/{filePath}`
- `GET /api/media/image/{showNoteId}/{filePath}`
- `GET /api/media/video/{showNoteId}/{filePath}`
- `DELETE /api/show-notes/{id}`
- `POST /api/show-notes/{id}/assets/preview`
- `POST /api/show-notes/{id}/assets`
- `GET /api/show-notes/{id}/storage/...`
- `GET|POST|PUT|DELETE /api/presets`

## Costs

Processing preview responses contain USD cost estimates only:

```json
{
  "breakdown": {
    "transcription": 0.0007,
    "document": 0,
    "llm": 0.0021,
    "tts": 0,
    "image": 0,
    "music": 0,
    "video": 0,
    "total": 0.0028
  }
}
```

The UI formats these USD values as cents.
