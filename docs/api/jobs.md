# Jobs API

## Get Job

```http
GET /api/jobs/{id}
```

Returns the current job snapshot for any known job id.

```json
{
  "id": "job_...",
  "status": "processing",
  "currentStep": 2,
  "stepName": "Transcription",
  "overallProgress": 45,
  "showNoteId": null
}
```

`404` means the job does not exist.
