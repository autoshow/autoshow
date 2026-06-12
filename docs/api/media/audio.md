# Audio Media

```http
GET /api/media/audio/{showNoteId}/{filePath}
```

Serves audio files for any non-deleted show note, including original audio, TTS output, and generated music.

Path traversal is blocked by scoped path resolution. Files are served only from `artifacts/output/{showNoteId}/...`.
