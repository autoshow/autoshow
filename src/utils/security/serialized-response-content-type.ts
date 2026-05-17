export const SERIALIZED_RESPONSE_CONTENT_TYPE = 'application/octet-stream'

const getResponseHeaderText = (value: string | string[] | number | undefined): string | undefined => {
  if (value === undefined) return undefined
  if (Array.isArray(value)) {
    return value[0] === undefined ? undefined : String(value[0]).trim()
  }
  return String(value).trim()
}

export const getSerializedResponseContentTypeOverride = (
  serializedHeader: string | string[] | number | undefined,
  contentTypeHeader: string | string[] | number | undefined,
): string | null => {
  if (getResponseHeaderText(serializedHeader) === undefined) return null

  const contentType = getResponseHeaderText(contentTypeHeader)
  if (!contentType || contentType.toLowerCase().split(';', 1)[0]?.trim() === 'text/plain') {
    return SERIALIZED_RESPONSE_CONTENT_TYPE
  }

  return null
}
