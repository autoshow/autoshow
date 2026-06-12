# Progress Tracking Architecture

Current progress tracking model used by processing jobs.

## Outline

- [Source of Truth](#source-of-truth)
- [Data Flow](#data-flow)
- [Progress Shape](#progress-shape)
- [Behavior Notes](#behavior-notes)

## Source of Truth

`src/utils/job-progress.ts` is the source of truth for progress step numbers, names, weights, and timing keys.

| Step | Name | Weight | Timing Key |
|---:|---|---:|---|
| `1` | `Download Audio` | `15` | `download` |
| `2` | `Extract Text` | `40` | `transcription` |
| `3` | `Write and TTS` | `20` | `writeAndTts` |
| `4` | `Image, Video, and Music` | `25` | `media` |

## Data Flow

```text
Job worker
  -> ProcessJobProgressTracker
  -> updateJobProgress(...)
  -> persist step/status/progress/message fields to the jobs table

Client
  -> polls GET /api/jobs/{id}
  -> route returns a global job snapshot
```

## Progress Shape

```json
{
  "currentStep": 2,
  "stepName": "Extract Text",
  "stepProgress": 45,
  "overallProgress": 28,
  "status": "processing",
  "message": "Transcribing audio...",
  "error": null,
  "showNoteId": null
}
```

## Behavior Notes

- `overallProgress` is weighted using the stage weights above, not a simple average of step percentages.
- The grouped Write and TTS stage surfaces sub-step status through messages such as `Running LLM...` and `Running TTS...` without splitting the progress bar into smaller stages.
- The grouped media stage runs image, then video, then music when those sections are enabled.
- Legacy step names such as `Output Selection`, `LLM Generation`, and `Text-to-Speech` still map to permanent timing-key aliases for historical job records.
- `GET /api/jobs/{id}` returns `404` when the job does not exist.
