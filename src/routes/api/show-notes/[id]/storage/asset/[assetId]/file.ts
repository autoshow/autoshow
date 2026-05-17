import type { APIEvent } from "@solidjs/start/server"
import { handleShowNoteAssetStorageRequest } from "../../storage-handler"

export async function GET(event: APIEvent) {
  return await handleShowNoteAssetStorageRequest(event, 'file')
}
