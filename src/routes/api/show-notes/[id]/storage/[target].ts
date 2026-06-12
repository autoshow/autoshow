import type { APIEvent } from "@solidjs/start/server"
import { handleShowNoteStorageTargetRequest } from "./storage-handler"

export async function GET(event: APIEvent) {
  return await handleShowNoteStorageTargetRequest(event)
}
