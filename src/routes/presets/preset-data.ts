import { query } from "@solidjs/router"
import { getDatabase,initializeSchema } from "~/database/db"
import { getPreset,listPresets } from "~/database/presets"
import { getServerDocumentRuntimeCapabilities } from "~/models"
import type { DocumentRuntimeCapabilities,PresetRecord } from "~/types"
import { isGoogleDriveImportConfigured } from "~/utils/google-drive-config-status"

export type PresetListData = {
  presets: PresetRecord[]
}

export type CreateRouteData = {
  documentRuntimeCapabilities: DocumentRuntimeCapabilities
  googleDriveImportConfigured: boolean
  presets: PresetRecord[]
}

export type PresetEditorRouteData = {
  documentRuntimeCapabilities: DocumentRuntimeCapabilities
  preset: PresetRecord | null
}

export type NewPresetRouteData = {
  documentRuntimeCapabilities: DocumentRuntimeCapabilities
}

export const getCreateRouteData = query(async (): Promise<CreateRouteData> => {
  "use server"
  const db = getDatabase()
  await initializeSchema(db)

  return {
    documentRuntimeCapabilities: getServerDocumentRuntimeCapabilities(),
    googleDriveImportConfigured: isGoogleDriveImportConfigured(),
    presets: await listPresets(db),
  }
}, "create-route-data")

export const getPresetListData = query(async (): Promise<PresetListData> => {
  "use server"
  const db = getDatabase()
  await initializeSchema(db)

  return {
    presets: await listPresets(db),
  }
}, "preset-list-data")

export const getNewPresetRouteData = query(async (): Promise<NewPresetRouteData> => {
  "use server"

  return {
    documentRuntimeCapabilities: getServerDocumentRuntimeCapabilities(),
  }
}, "new-preset-route-data")

export const getPresetEditorRouteData = query(async (id: string): Promise<PresetEditorRouteData> => {
  "use server"
  const db = getDatabase()
  await initializeSchema(db)

  return {
    documentRuntimeCapabilities: getServerDocumentRuntimeCapabilities(),
    preset: await getPreset(db, id),
  }
}, "preset-editor-route-data")
