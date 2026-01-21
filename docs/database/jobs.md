# Jobs

> `src/database/jobs.ts`

Job tracking for background processing tasks.

## Types

```typescript
interface CreateJobInput {
  status: JobStatus
  inputData: string
  createdAt: number
}

interface UpdateJobProgressInput {
  status?: JobStatus
  currentStep?: number
  stepName?: string
  stepProgress?: number
  overallProgress?: number
  message?: string
  startedAt?: number
  updatedAt?: number
}

type JobStatus = 'pending' | 'processing' | 'completed' | 'error'
```

---

## Functions

### `createJob(db, id, input)`

Creates a new job record.

```typescript
createJob(db: Database, id: string, input: CreateJobInput): void
```

### `getJobById(db, id)`

Retrieves a job by ID with field mapping from snake_case to camelCase.

```typescript
getJobById(db: Database, id: string): Job | null
```

Returns:
```typescript
{
  id: string
  status: JobStatus
  currentStep: number
  stepName: string | null
  stepProgress: number
  overallProgress: number
  message: string | null
  error: string | null
  showNoteId: string | null
  inputData: string
  createdAt: number
  startedAt: number | null
  completedAt: number | null
  updatedAt: number
}
```

### `updateJobProgress(db, id, input)`

Updates job progress fields dynamically. Only updates fields that are provided.

```typescript
updateJobProgress(db: Database, id: string, input: UpdateJobProgressInput): void
```

### `completeJob(db, id, showNoteId)`

Marks a job as completed and links it to the created show note.

```typescript
completeJob(db: Database, id: string, showNoteId: string): void
```

Sets:
- `status` → `'completed'`
- `show_note_id` → provided showNoteId
- `completed_at` → `Date.now()`
- `updated_at` → `Date.now()`
- `overall_progress` → `100`
- `step_progress` → `100`

### `failJob(db, id, error)`

Marks a job as failed with an error message.

```typescript
failJob(db: Database, id: string, error: string): void
```

Sets:
- `status` → `'error'`
- `error` → provided error message
- `completed_at` → `Date.now()`
- `updated_at` → `Date.now()`
