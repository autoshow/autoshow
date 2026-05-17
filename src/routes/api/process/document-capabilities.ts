import type { APIEvent } from "@solidjs/start/server"
import { getServerDocumentRuntimeCapabilities } from "~/models"

export async function GET(_: APIEvent) {
  return Response.json(getServerDocumentRuntimeCapabilities())
}
