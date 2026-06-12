# Video Generation Models (Step 4: Image, Video, and Music)

The video registry exposes the curated text-to-video services configured in `src/models/models-config/video-config.ts`.

Speed grades below are the current `deriveSpeedLabel(...)` outputs from the registry's representative five-second video workload.

## Outline

- [Current Registry](#current-registry)
- [Prompt Types](#prompt-types)
- [Selection Example](#selection-example)
- [Notes](#notes)
- [Security Context](#security-context)

## Current Registry

| Service | Model ID | Speed | Quality | Cost/Sec | Sizes | Durations | Aspect Ratios | Env Variable |
|---------|----------|-------|---------|----------|-------|-----------|---------------|--------------|
| `gemini` | `veo-3.1-generate-preview` | A | A | `$0.40` | `720p`, `1080p`, `4k` | `4`, `6`, `8` | `16:9`, `9:16` | `GEMINI_API_KEY` |
| `gemini` | `veo-3.1-fast-generate-preview` | A | B | `$0.35` | `720p`, `1080p`, `4k` | `4`, `6`, `8` | `16:9`, `9:16` | `GEMINI_API_KEY` |
| `runway` | `gen4.5` | B | A+ | `$0.12` | `1920x1080`, `1080x1920`, `1280x720`, `720x1280` | `4`, `6`, `8` | size-driven | `RUNWAYML_API_SECRET` |
| `deepinfra` | `Wan-AI/Wan2.1-T2V-1.3B` | B | B | `$0.02` | `832x480`, `480x832` | `4`, `8` | `16:9`, `9:16` | `DEEPINFRA_API_KEY` |
| `minimax` | `MiniMax-Hailuo-2.3` | B | A | `$0.04` | `768P`, `1080P`, `720P` | `6`, `10` | size-driven | `MINIMAX_API_KEY` |
| `minimax` | `MiniMax-Hailuo-02` | B | A | `$0.04` | `768P`, `1080P`, `720P` | `6`, `10` | size-driven | `MINIMAX_API_KEY` |
| `minimax` | `T2V-01-Director` | C | B | `$0.04` | `768P`, `1080P`, `720P` | `6`, `10` | size-driven | `MINIMAX_API_KEY` |
| `minimax` | `T2V-01` | B | B | `$0.04` | `768P`, `1080P`, `720P` | `6`, `10` | size-driven | `MINIMAX_API_KEY` |
| `grok` | `grok-imagine-video` | A | A | `$0.05` | `720p`, `480p` | `1` through `15` | `16:9`, `4:3`, `1:1`, `9:16`, `3:4`, `3:2`, `2:3` | `XAI_API_KEY` |
| `glm` | `cogvideox-3` | B | A | `$0.04` | `1920x1080`, `1080x1920`, `1280x720` | `5` | size-driven | `GLM_API_KEY` |
| `glm` | `viduq1-text` | C | B | `$0.08` | `1920x1080`, `1080x1920`, `1280x720` | `5` | size-driven | `GLM_API_KEY` |
| `deapi` | `Ltxv_13B_0_9_8_Distilled_FP8` | B | B | `$0.02` | `1280x720`, `720x1280`, `1024x1024` | `4`, `8` | `16:9`, `9:16`, `1:1` | `DEAPI_API_KEY` |

## Prompt Types

Current video prompt ids are:

- `explainer`
- `highlight`
- `intro`
- `outro`
- `social`

## Selection Example

```bash
-F "videoGenEnabled=true" \
-F "videoService=deepinfra" \
-F "videoModel=Wan-AI/Wan2.1-T2V-1.3B" \
-F "videoSize=832x480" \
-F "videoAspectRatio=16:9" \
-F "videoDuration=4" \
-F "selectedVideoPrompts=explainer"
```

## Notes

- Default video service: `runway`
- Default video model: `gen4.5`
- Default video size and duration: `1280x720` and `8`
- Scene descriptions use the selected Step 3 LLM when available; otherwise the scene-description helper falls back to `openai` + `gpt-5.4`.
- The process form still accepts `selectedVideoPrompts` as a comma-separated list, but the current create flow limits the picker to one video prompt.
- For providers without an explicit aspect-ratio list, the selected size determines the output orientation.
- Some adapters can return a more precise runtime cost than the static registry entry; the Step 4 media stage will prefer the adapter-provided cost when available.

## Security Context

- Video generation runs through processing jobs at [`POST /api/process`](../api/process.md).
- Generated videos and thumbnails are served through global media APIs.
