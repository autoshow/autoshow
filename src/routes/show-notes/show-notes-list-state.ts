import type { ShowNote } from "~/types"

export type ShowNotesListState =
  | {
      status: "loading"
      notes: ShowNote[]
    }
  | {
      status: "ready"
      notes: ShowNote[]
    }
  | {
      status: "invalid"
      notes: ShowNote[]
    }

const filterVisibleNotes = (
  notes: ShowNote[],
  locallyDeletedIds: readonly string[]
): ShowNote[] => {
  if (locallyDeletedIds.length === 0) {
    return [...notes]
  }

  const hiddenIds = new Set(locallyDeletedIds)
  return notes.filter(note => !hiddenIds.has(note.id))
}

const getReadyOrInvalidState = (
  payload: unknown,
  locallyDeletedIds: readonly string[]
): ShowNotesListState => {
  if (!Array.isArray(payload)) {
    return {
      status: "invalid",
      notes: [],
    }
  }

  return {
    status: "ready",
    notes: filterVisibleNotes(payload as ShowNote[], locallyDeletedIds),
  }
}

export const getShowNotesListState = (
  current: unknown,
  latest: unknown,
  locallyDeletedIds: readonly string[] = []
): ShowNotesListState => {
  if (current !== undefined) {
    return getReadyOrInvalidState(current, locallyDeletedIds)
  }

  if (latest !== undefined) {
    return getReadyOrInvalidState(latest, locallyDeletedIds)
  }

  return {
    status: "loading",
    notes: [],
  }
}
