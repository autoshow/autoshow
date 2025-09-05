# Querying Show Notes

## Outline

- [Get All Show Notes](#get-all-show-notes)
- [Get A Single Show Note](#get-a-single-show-note)

## Get All Show Notes

```bash
curl http://localhost:4321/api/show-notes -s | json_pp
```

Returns:

```json
{
  "showNotes": [
    {
      "id": 1,
      "showLink": "...",
      "channel": "...",
      "title": "...",
      "description": "...",
      "publishDate": "...",
      "coverImage": "...",
      "frontmatter": "...",
      "prompt": "...",
      "transcript": "...",
      "llmOutput": "...",
      "llmService": "...",
      "llmModel": "...",
      "llmCost": 0,
      "transcriptionService": "...",
      "transcriptionModel": "...",
      "transcriptionCost": 0,
      "finalCost": 0
    },
    ...
  ]
}
```

## Get A Single Show Note

```bash
curl http://localhost:4321/api/show-notes/1 \
  -s | json_pp
```

Returns:

```json
{
  "showNote": {
    "id": 1,
    "showLink": "...",
    "channel": "...",
    "title": "...",
    "description": "...",
    "publishDate": "...",
    "coverImage": "...",
    "frontmatter": "...",
    "prompt": "...",
    "transcript": "...",
    "llmOutput": "...",
    "llmService": "...",
    "llmModel": "...",
    "llmCost": 0,
    "transcriptionService": "...",
    "transcriptionModel": "...",
    "transcriptionCost": 0,
    "finalCost": 0
  }
}
```