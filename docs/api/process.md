# Process API

Creates processing jobs and previews provider costs.

## Preview Cost

```http
POST /api/process/preview
Content-Type: application/json
```

Returns a USD cost breakdown without creating a job:

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

## Create Job

```http
POST /api/process
Content-Type: multipart/form-data
```

Common fields:

- `url` and `urlType`, or `uploadId`
- `transcriptionOption`
- `transcriptionModel`
- `llmEnabled`
- `llmService`
- `llmModel`
- `selectedPrompts`
- optional TTS, image, music, and video selections

Successful response:

```json
{
  "jobId": "job_..."
}
```

The route does not require a session and does not check or deduct balances. Runtime provider costs are stored as USD on the generated show note.

## YouTube Captions

Use `transcriptionOption=youtube` and `transcriptionModel=captions` for verified YouTube URLs with available captions. Caption extraction has no transcription-provider cost; downstream steps are still estimated normally.
