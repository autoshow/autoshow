# Show Notes API

Show notes are global local-app data. There is no owner check or public/private sharing state.

## Delete Show Note

```http
DELETE /api/show-notes/{id}
```

Soft-deletes a show note so it no longer appears in list, detail, media, or storage routes.

Responses:

- `200` with `{ "success": true }`
- `404` when the show note does not exist or is already deleted

## Append Assets

```http
POST /api/show-notes/{id}/assets/preview
POST /api/show-notes/{id}/assets
```

The preview route returns a USD cost breakdown. The submit route creates an append-assets job and returns `{ "jobId": "..." }`.
