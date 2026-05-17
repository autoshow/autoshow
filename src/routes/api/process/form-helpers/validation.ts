import * as v from 'valibot'
import type { ProcessingInputValidation,ValibotIssues,ValibotNonEmptyIssues } from '~/types'

const toNonEmptyIssues = (issues: ValibotIssues): ValibotNonEmptyIssues => {
  return issues as ValibotNonEmptyIssues
}

export function validateOrThrow<T>(
  schema: v.GenericSchema<unknown, T>,
  data: unknown,
  context?: string
): T {
  const result = v.safeParse(schema, data)
  if (result.success) {
    return result.output
  }
  const prefix = context ? `${context}: ` : ''
  throw new Error(`${prefix}${formatValidationError(result.issues)}`)
}

const formatValidationError = (issues: ValibotIssues): string => {
  const flat = v.flatten(toNonEmptyIssues(issues))
  const messages: string[] = []

  if (flat.root && flat.root.length > 0) {
    messages.push(...flat.root)
  }

  if (flat.nested) {
    for (const [path, pathIssues] of Object.entries(flat.nested)) {
      if (pathIssues && pathIssues.length > 0) {
        messages.push(`${path}: ${pathIssues.join(', ')}`)
      }
    }
  }

  return messages.length > 0 ? messages.join('; ') : 'Validation failed'
}

export const validationErrorResponse = (issues: ValibotIssues, status = 400): Response => {
  return Response.json(
    {
      error: 'Validation failed',
      details: v.flatten(toNonEmptyIssues(issues))
    },
    { status }
  )
}

export const validateProcessingInput = (input: ProcessingInputValidation): string | null => {
  if (input.llmEnabled && input.selectedPrompts.length === 0) {
    return 'Please select at least one content type to generate when LLM text output is enabled'
  }

  if (input.imageGenEnabled && input.selectedImagePrompts.length === 0) {
    return 'Please select at least one image prompt when image generation is enabled'
  }

  if (input.videoGenEnabled && input.selectedVideoPrompts.length === 0) {
    return 'Please select at least one video type when video generation is enabled'
  }

  const hasUrl = input.url && input.url.trim() && input.urlType
  const hasUpload = input.uploadId
  const sourceCount = [hasUrl, hasUpload].filter(Boolean).length

  if (sourceCount === 0) {
    return 'Please provide a URL or uploaded file reference'
  }

  if (sourceCount > 1) {
    return 'Please provide only one source (URL or uploaded file reference)'
  }

  return null
}
