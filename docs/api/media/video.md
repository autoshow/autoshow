# Video Media

```http
GET /api/media/video/{showNoteId}/{filePath}
```

Serves generated video files for any non-deleted show note.

Path traversal is blocked by scoped path resolution. Files are served only from `artifacts/output/{showNoteId}/...`.
