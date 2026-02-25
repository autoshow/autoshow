# Progress Tracking Architecture

```
+----------------------------------------------------------------------------+
|                          PROGRESS TRACKER SYSTEM                           |
|                                                                             |
|  Client (Browser)                                                          |
|       ^                                                                    |
|       | Server-Sent Events (SSE) via job polling                          |
|       |                                                                    |
|  +----+----------------------------------------------------------------+  |
|  | IProgressTracker Interface (src/types/progress.ts)                   |  |
|  |                                                                       |  |
|  |  startStep(step: number, message: string)                            |  |
|  |       |                                                              |  |
|  |  updateStepProgress(step: number, progress: number, message: string) |  |
|  |       |                                                              |  |
|  |  updateStepWithSubStep(step, current, total, description, message)   |  |
|  |       |                                                              |  |
|  |  Emits: { step, stepProgress, overallProgress, subStep: {...} }      |  |
|  |       |                                                              |  |
|  |  completeStep(step: number, message: string)                         |  |
|  |       |                                                              |  |
|  |  complete(showNoteId: string)                                        |  |
|  |       |                                                              |  |
|  |  Emits: { status: 'completed', showNoteId: '...' }                   |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  Progress Update Schema:                                                   |
|  +----------------------------------------------------------------------+  |
|  | {                                                                     |  |
|  |   step: number,                                                      |  |
|  |   stepName: string,                                                  |  |
|  |   stepProgress: number,                                              |  |
|  |   overallProgress: number,                                           |  |
|  |   status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped',|
|  |   message: string,                                                   |  |
|  |   subStep?: { current: number, total: number, description?: string },|  |
|  |   error?: string,                                                    |  |
|  |   showNoteId?: string                                                |  |
|  | }                                                                     |  |
|  +----------------------------------------------------------------------+  |
+----------------------------------------------------------------------------+
```

