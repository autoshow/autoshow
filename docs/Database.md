# Database Architecture

## Overview

SQLite database with Bun's native driver. Stores show notes, processing metadata, and job status for audio/video content.

## Files

| File | Description |
|------|-------------|
| [db.md](database/db.md) | Connection management and schema definitions |
| [create-show-note.md](database/create-show-note.md) | Insert operations and saveResults helper |
| [jobs.md](database/jobs.md) | Job tracking operations |
| [show-note-query.md](database/show-note-query.md) | Single record retrieval |
| [show-notes-query.md](database/show-notes-query.md) | List retrieval |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Processing Pipeline                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─ Step 1: Audio Download
                      ├─ Step 2: Transcription
                      ├─ Step 3: Prompt Selection
                      ├─ Step 4: LLM Processing
                      ├─ Step 5: TTS (optional)
                      ├─ Step 6: Image Gen (optional)
                      ├─ Step 7: Music Gen (optional)
                      └─ Step 8: Video Gen (optional)
                      │
                      ▼
        ┌─────────────────────────────┐
        │    saveResults()             │
        │  - Read summary.md           │
        │  - Read transcription.txt    │
        │  - Extract metadata          │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │   createShowNote()           │
        │  - Transform arrays          │
        │  - Map metadata              │
        │  - Insert record             │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │   SQLite Database            │
        │   show_notes table           │
        │   jobs table                 │
        └─────────────────────────────┘
                   │
                   ├─ getShowNoteById()  → Single Record
                   └─ getRecentShowNotes() → List (20 latest)
```

---

## Data Flow

```
┌──────────────┐
│ ProcessingMetadata │
│ (8 steps)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌─────────────┐
│ ShowNoteInput│────▶│ Database    │
│              │     │ Transformer │
└──────────────┘     └──────┬──────┘
                            │
                   ┌────────┴────────┐
                   │                 │
                   ▼                 ▼
        ┌─────────────────┐  ┌─────────────┐
        │ Flatten Arrays  │  │ Map Metadata│
        │ selectedPrompts │  │ step1..step8│
        │ → CSV string    │  │ → columns   │
        └─────────────────┘  └─────────────┘
                   │                 │
                   └────────┬────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  INSERT Query  │
                   │  55 columns    │
                   └────────────────┘
```

---

## Integration Points

**From Processing Pipeline:**
```typescript
// After all steps complete
await saveResults(showNoteId, metadata, options, processingMetadata, promptInstructions)
```

**To SolidJS Routes:**
```typescript
// Single show
export const route = {
  load: ({ params }) => getShowNote(params.id)
}

// Show list
export const route = {
  load: () => getShowNotes()
}
```
