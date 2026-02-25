# Job Status

Get the current status and progress of a processing job.

## Outline

- [Endpoint](#endpoint)
- [Description](#description)
- [Request](#request)
- [Response](#response)
- [Fields](#fields)
- [Job Statuses](#job-statuses)
- [Step Names](#step-names)
- [Example](#example)
- [Polling Example (JavaScript)](#polling-example-javascript)
- [Notes](#notes)

## Endpoint

```
GET /api/jobs/{id}
```

## Description

Retrieves the current status of a background processing job created by the [Process](./process.md) endpoint. Use this endpoint to poll for progress updates.

## Request

**Path Parameters:**

| Parameter | Type   | Required | Description                         |
|-----------|--------|----------|-------------------------------------|
| `id`      | string | Yes      | Job ID returned from `/api/process` |

## Response

**Status Codes:**
- `200` - Job found
- `400` - Missing job ID
- `404` - Job not found

**Success Response - Processing (200):**

```json
{
  "id": "job_1700654321000_abc123xyz",
  "status": "processing",
  "currentStep": 2,
  "stepName": "Transcription",
  "stepProgress": 45,
  "overallProgress": 28,
  "message": "Transcribing audio...",
  "error": null,
  "showNoteId": null,
  "inputData": "{...}",
  "createdAt": 1700654321000,
  "startedAt": 1700654322000,
  "completedAt": null,
  "updatedAt": 1700654350000
}
```

**Success Response - Completed (200):**

```json
{
  "id": "job_1700654321000_abc123xyz",
  "status": "completed",
  "currentStep": 8,
  "stepName": "Video Generation",
  "stepProgress": 100,
  "overallProgress": 100,
  "message": "All processing steps completed successfully",
  "error": null,
  "showNoteId": "abc-123-xyz-789",
  "inputData": "{...}",
  "createdAt": 1700654321000,
  "startedAt": 1700654322000,
  "completedAt": 1700654890000,
  "updatedAt": 1700654890000
}
```

**Success Response - Error (200):**

```json
{
  "id": "job_1700654321000_abc123xyz",
  "status": "error",
  "currentStep": 2,
  "stepName": "Transcription",
  "stepProgress": 0,
  "overallProgress": 12,
  "message": "Transcription failed",
  "error": "Groq API quota exceeded",
  "showNoteId": null,
  "inputData": "{...}",
  "createdAt": 1700654321000,
  "startedAt": 1700654322000,
  "completedAt": 1700654400000,
  "updatedAt": 1700654400000
}
```

**Error Response (400):**

```json
{
  "error": "Validation failed",
  "details": {
    "root": ["Invalid type: Expected string but received undefined"]
  }
}
```

**Error Response (404):**

```json
{
  "error": "Job not found"
}
```

## Fields

| Field             | Type             | Description                                                    |
|-------------------|------------------|----------------------------------------------------------------|
| `id`              | string           | Unique job identifier                                          |
| `status`          | string           | Job status: `pending`, `processing`, `completed`, `error`      |
| `currentStep`     | number           | Current processing step (0-8, where 0 is initial state)        |
| `stepName`        | string           | Human-readable step name                                       |
| `stepProgress`    | number           | Progress percentage for current step (0-100)                   |
| `overallProgress` | number           | Overall pipeline progress (0-100)                              |
| `message`         | string           | Human-readable status message                                  |
| `error`           | string \| null   | Error details (only when status is `error`)                    |
| `showNoteId`      | string \| null   | Generated show note ID (only when status is `completed`)       |
| `inputData`       | string           | JSON-encoded original processing options                       |
| `createdAt`       | number           | Unix timestamp (ms) when job was created                       |
| `startedAt`       | number \| null   | Unix timestamp (ms) when processing started                    |
| `completedAt`     | number \| null   | Unix timestamp (ms) when job finished                          |
| `updatedAt`       | number           | Unix timestamp (ms) of last update                             |

## Job Statuses

| Status       | Description                      |
|--------------|----------------------------------|
| `pending`    | Job created but not yet started  |
| `processing` | Job is actively being processed  |
| `completed`  | Job finished successfully        |
| `error`      | Job failed with an error         |

## Step Names

| Step | Name              | Weight |
|------|-------------------|--------|
| 1    | Download Audio    | 12%    |
| 2    | Transcription     | 35%    |
| 3    | Content Selection | 5%     |
| 4    | LLM Generation    | 20%    |
| 5    | Text-to-Speech    | 5%     |
| 6    | Image Generation  | 5%     |
| 7    | Music Generation  | 5%     |
| 8    | Video Generation  | 13%    |

## Example

```bash
curl http://localhost:4321/api/jobs/job_1700654321000_abc123xyz
```

## Polling Example (JavaScript)

```javascript
async function waitForJob(jobId, onProgress) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      const response = await fetch(`/api/jobs/${jobId}`)
      const job = await response.json()
      
      if (job.error && !job.showNoteId) {
        // API error (404, etc.)
        reject(new Error(job.error))
        return
      }
      
      // Report progress
      if (onProgress) {
        onProgress(job)
      }
      
      if (job.status === 'completed') {
        resolve(job.showNoteId)
        return
      }
      
      if (job.status === 'error') {
        reject(new Error(job.error || 'Processing failed'))
        return
      }
      
      // Continue polling
      setTimeout(poll, 2000)
    }
    
    poll()
  })
}

// Usage
try {
  const showNoteId = await waitForJob('job_1700654321000_abc123xyz', (job) => {
    console.log(`${job.stepName}: ${job.overallProgress}%`)
  })
  console.log('Complete:', showNoteId)
} catch (error) {
  console.error('Failed:', error.message)
}
```

## Notes

- Poll every 2-5 seconds for reasonable update frequency
- Jobs persist in database even after completion
- `inputData` contains the original processing options for debugging
- `showNoteId` is only set when `status` is `completed`
- Skipped optional steps (TTS, Image, Music, Video) are marked complete with 100% progress
