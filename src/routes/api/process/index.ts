import type { APIEvent } from "@solidjs/start/server"
import { err } from "~/utils/logging"
import { validationErrorResponse, validateProcessingInput } from "~/types"
import {
  parseProcessingFormData,
  buildProcessingOptions,
  createAndDispatchJob
} from "./form-helpers"

export async function POST({ request }: APIEvent) {
  try {
    const formData = await request.formData()

    const formResult = parseProcessingFormData(formData)
    if (!formResult.success) {
      return validationErrorResponse(formResult.issues)
    }

    let options
    try {
      options = buildProcessingOptions(formResult.output)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid processing options' },
        { status: 400 }
      )
    }

    const validationError = validateProcessingInput({
      url: options.url,
      urlType: options.urlType,
      uploadedFilePath: options.localFilePath,
      uploadedFileName: options.localFileName,
      selectedPrompts: options.selectedPrompts,
      imageGenEnabled: options.imageGenEnabled ?? false,
      selectedImagePrompts: options.selectedImagePrompts ?? [],
      videoGenEnabled: options.videoGenEnabled ?? false,
      selectedVideoPrompts: options.selectedVideoPrompts ?? []
    })

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 })
    }

    const jobId = await createAndDispatchJob(options)

    return Response.json({ jobId })

  } catch (error) {
    err('Failed to create processing job', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to start processing' },
      { status: 500 }
    )
  }
}
