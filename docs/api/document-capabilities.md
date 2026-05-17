# Document Capabilities

Read-only document preprocessing capabilities for the current server runtime.

## Outline

- [Endpoint](#endpoint)
- [Access](#access)
- [Response](#response)
- [Notes](#notes)

## Endpoint

```text
GET /api/process/document-capabilities
```

## Access

Public endpoint (no authentication required).

## Response

The response is JSON:

```json
{
  "canConvertTiffToPng": false
}
```

`canConvertTiffToPng` is `true` only when ImageMagick's `magick` binary is available on the server. The create flow uses this to decide whether TIFF inputs can be preprocessed for document services that require PNG conversion.

PPTX and XLSX preprocessing is built into the server and does not require a runtime capability flag. These Office files are extracted locally to Markdown text before being sent to text-capable document services.

## Notes

- Returns `application/json; charset=utf-8`.
- The create flow fetches this endpoint to adapt available document options to the current runtime.
- This endpoint reports runtime conversion support only. It does not expose API key presence or the full document model registry.
- Office preprocessing supports modern `.pptx` and `.xlsx` only. Legacy or macro-enabled Office formats are not accepted.
