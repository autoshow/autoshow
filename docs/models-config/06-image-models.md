# Image Generation Models (Step 4: Image, Video, and Music)

The image registry exposes the curated text-to-image services configured in `src/models/models-config/image-config.ts`.

Speed grades below are the current `deriveSpeedLabel(...)` outputs from the registry's representative one-image workload.

## Outline

- [Current Registry](#current-registry)
- [Prompt Types](#prompt-types)
- [Selection Example](#selection-example)
- [Notes](#notes)
- [Security Context](#security-context)

## Current Registry

| Service | Model ID | Speed | Quality | Cost | Size or Aspect-Ratio Support | Env Variable |
|---------|----------|-------|---------|------|------------------------------|--------------|
| `openai` | `gpt-image-1.5` | C | A | `1024x1024=$0.009`, `1536x1024=$0.011`, `1024x1536=$0.011` | `1024x1024`, `1536x1024`, `1024x1536` | `OPENAI_API_KEY` |
| `openai` | `gpt-image-1` | C | A | `1024x1024=$0.009`, `1536x1024=$0.011`, `1024x1536=$0.011` | `1024x1024`, `1536x1024`, `1024x1536` | `OPENAI_API_KEY` |
| `openai` | `gpt-image-1-mini` | C | B | `1024x1024=$0.005`, `1536x1024=$0.006`, `1024x1536=$0.006` | `1024x1024`, `1536x1024`, `1024x1536` | `OPENAI_API_KEY` |
| `gemini` | `gemini-2.5-flash-image` | A | B | `$0.020/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `GEMINI_API_KEY` |
| `gemini` | `gemini-3-pro-image-preview` | B | A | `$0.080/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `GEMINI_API_KEY` |
| `minimax` | `image-01` | A | A | `$0.0035/image` | `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9` | `MINIMAX_API_KEY` |
| `grok` | `grok-imagine-image` | A | A | `$0.020/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `XAI_API_KEY` |
| `runway` | `gen4_image` | B | A | `1:1=$0.05`, `16:9=$0.08`, `9:16=$0.08`, `4:3=$0.05` | `1:1`, `16:9`, `9:16`, `4:3` | `RUNWAYML_API_SECRET` |
| `deepinfra` | `black-forest-labs/FLUX-2-klein-4b` | A | B | `$0.014/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `DEEPINFRA_API_KEY` |
| `deapi` | `Flux1schnell` | C | B | `$0.0014/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `DEAPI_API_KEY` |
| `flux` | `flux-2-klein-4b` | A | B | `$0.014/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `BFL_API_KEY` |
| `flux` | `flux-2-klein-9b` | A | A | `$0.015/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `BFL_API_KEY` |
| `flux` | `flux-2-pro` | B | A | `$0.030/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `BFL_API_KEY` |
| `flux` | `flux-2-max` | C | A | `$0.060/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `BFL_API_KEY` |
| `glm` | `glm-image` | B | A | `$0.015/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `GLM_API_KEY` |
| `glm` | `cogView-4-250304` | B | B | `$0.010/image` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `GLM_API_KEY` |

## Prompt Types

Current image prompt ids are:

- `keyMoment`
- `thumbnail`
- `conceptual`
- `infographic`
- `character`
- `quote`

## Selection Example

```bash
-F "imageGenEnabled=true" \
-F "imageService=runway" \
-F "imageModel=gen4_image" \
-F "imageDimensionOrRatio=1:1" \
-F "selectedImagePrompts=thumbnail"
```

## Notes

- The create flow currently initializes image generation to `openai` + `gpt-image-1.5` + `1024x1024`.
- Image generation reads `transcription.txt` as its text source, so it can run even when Step 3 writing is disabled.
- The process form still accepts `selectedImagePrompts` as a comma-separated list, but the current create flow limits the picker to one image prompt.
- Ratio-based services stay ratio-based in the registry. Runway-specific pixel-size mapping happens inside the adapter rather than leaking raw dimensions into the UI config.
- All providers in the current registry carry explicit static costs.

## Security Context

- Image generation runs through processing jobs at [`POST /api/process`](../api/process.md).
- Generated image files are served through global media routes.
