# Document Extraction Models (Step 2)

Document extraction is configured per service in `src/models/models-config/document-config.ts`.

The app infers document mode from `urlType=document` or an uploaded filename extension. You do not need to send `inputType=document` directly in the process form.

## Outline

- [Current Registry](#current-registry)
- [Service Notes](#service-notes)
- [Selection Example](#selection-example)
- [Security Context](#security-context)

## Current Registry

| Service | Model ID | Supported Types | Default | Env Variable |
|---------|----------|-----------------|---------|--------------|
| `mistral-ocr` | `mistral-ocr-latest` | `pdf`, `png`, `jpg`, `tiff`, `txt`, `docx` | default model | `MISTRAL_API_KEY` |
| `glm` | `glm-ocr` | `pdf`, `png`, `jpg` | `-` | `GLM_API_KEY` |
| `openai` | `gpt-5.4-pro`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano` | `pdf`, `png`, `jpg`, `tiff`, `txt`, `docx`, `pptx`, `xlsx` | `-` | `OPENAI_API_KEY` |
| `claude` | `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` | `pdf`, `png`, `jpg`, `tiff`, `txt`, `pptx`, `xlsx` | `-` | `ANTHROPIC_API_KEY` |
| `gemini` | `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite-preview` | `pdf`, `png`, `jpg`, `tiff`, `txt`, `pptx`, `xlsx` | `-` | `GEMINI_API_KEY` |
| `grok` | `grok-4.20-0309-non-reasoning` | `pdf`, `png`, `jpg`, `tiff`, `txt`, `pptx`, `xlsx` | `-` | `XAI_API_KEY` |
| `deapi` | `Nanonets_Ocr_S_F16` | `png`, `jpg` | `-` | `DEAPI_API_KEY` |

## Service Notes

- Default service: `mistral-ocr`
- Default model: `mistral-ocr-latest`
- Local document uploads infer `documentType` from the filename extension.
- Remote document URLs must be submitted with `urlType=document`.
- `openai`, `claude`, `gemini`, and `grok` convert TIFF to PNG first when ImageMagick is available at runtime.
- `pptx` and `xlsx` inputs are extracted locally to Markdown, then sent to `openai`, `claude`, `gemini`, or `grok` as text.
- Legacy `.ppt`/`.xls`, macro-enabled `.pptm`/`.xlsm`, and formula evaluation are not supported.
- `deapi` is image-only and currently runs on `png` and `jpg` inputs.

## Selection Example

```bash
-F "url=https://example.com/report.pdf" \
-F "urlType=document" \
-F "documentService=mistral-ocr" \
-F "documentModel=mistral-ocr-latest" \
-F "documentType=pdf"
```

## Security Context

- Models are invoked through processing jobs at [`POST /api/process`](../api/process.md).
- Remote document URLs are validated by the public-network SSRF guard before model execution.
- Generated outputs are available through global job and media APIs.
