import * as v from 'valibot'
import type { DocumentExtractionModel } from './step-2-document-types'

export const BigIntSchema = v.pipe(
  v.union([v.string(), v.number()]),
  v.transform(val => Number(val)),
  v.number(),
  v.integer(),
  v.minValue(0)
)

export const NullableBigIntSchema = v.nullable(BigIntSchema)

type FlatValidationErrors = {
  readonly root?: [string, ...string[]]
  readonly nested?: Readonly<Record<string, [string, ...string[]] | undefined>>
  readonly other?: [string, ...string[]]
}

export type ValidationSuccess<T> = { success: true; data: T }
export type ValidationFailure = { success: false; error: string; issues: FlatValidationErrors }
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export type ProcessingInputValidation = {
  url: string | undefined
  urlType: string | undefined
  uploadedFilePath: string | undefined
  uploadedFileName: string | undefined
  selectedPrompts: string[]
  imageGenEnabled: boolean
  selectedImagePrompts: string[]
  videoGenEnabled: boolean
  selectedVideoPrompts: string[]
}

export type DocumentOptionsInput = {
  urlType: string | undefined
  uploadedFilePath: string | undefined
  uploadedFileName: string | undefined
  documentServiceInput: string | undefined
  documentModel: string | undefined
  documentTypeString: string | undefined
  disableDocumentCacheString: string | undefined
}

export type ResolvedDocumentOptions = {
  isDocument: boolean
  isDocumentUrl: boolean
  isDocumentFile: boolean
  disableDocumentCache: boolean
  resolvedDocumentService: 'llamaparse' | 'mistral-ocr' | undefined
  resolvedDocumentModel: DocumentExtractionModel | undefined
  resolvedDocumentType: string | null | undefined
}
