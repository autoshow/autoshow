import * as v from 'valibot'

export type ValidationSuccess<T> = { success: true; data: T }
export type ValidationFailure = { success: false; error: string; issues: v.FlatErrors<undefined> }
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export const validate = <T>(
  schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
  data: unknown
): ValidationResult<T> => {
  const result = v.safeParse(schema, data)
  if (result.success) {
    return { success: true, data: result.output }
  }
  return {
    success: false,
    error: formatValidationError(result.issues),
    issues: v.flatten(result.issues)
  }
}

export const validateOrThrow = <T>(
  schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
  data: unknown,
  context?: string
): T => {
  const result = v.safeParse(schema, data)
  if (result.success) {
    return result.output
  }
  const prefix = context ? `${context}: ` : ''
  throw new Error(`${prefix}${formatValidationError(result.issues)}`)
}

export const formatValidationError = (issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]): string => {
  const flat = v.flatten(issues)
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

export const validationErrorResponse = (issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]], status = 400): Response => {
  return Response.json(
    {
      error: 'Validation failed',
      details: v.flatten(issues)
    },
    { status }
  )
}
