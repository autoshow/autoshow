# LLM Models (Step 3: Write and TTS)

The LLM registry exposes the curated Step 3 writing providers and model ids defined in `src/models/models-config/llm-config.ts`.

Speed grades below are the current `deriveSpeedLabel(...)` outputs from `speedProfile`, using the app's representative LLM workload.

## Outline

- [Current Registry](#current-registry)
- [Selection Example](#selection-example)
- [Notes](#notes)
- [Security Context](#security-context)

## Current Registry

| Provider | Model ID | Speed | Quality | Input $/MTok | Output $/MTok | Cache Read $/MTok | Context | Max Output | Input Modalities | Env Variable |
|----------|----------|-------|---------|--------------|---------------|-------------------|---------|------------|------------------|--------------|
| `openai` | `gpt-5.4-pro` | C | A | `30` | `180` | `-` | `1000000` | `128000` | `text,image` | `OPENAI_API_KEY` |
| `openai` | `gpt-5.4` | A | A | `2.5` | `15` | `0.25` | `1000000` | `128000` | `text,image` | `OPENAI_API_KEY` |
| `openai` | `gpt-5.4-mini` | A | A | `0.75` | `4.5` | `0.075` | `1000000` | `128000` | `text,image` | `OPENAI_API_KEY` |
| `openai` | `gpt-5.4-nano` | A | B | `0.2` | `1.25` | `0.02` | `1000000` | `128000` | `text,image` | `OPENAI_API_KEY` |
| `claude` | `claude-opus-4-6` | B | A | `5` | `25` | `0.5` | `1000000` | `128000` | `text,image,pdf` | `ANTHROPIC_API_KEY` |
| `claude` | `claude-sonnet-4-6` | A | A | `3` | `15` | `0.3` | `1000000` | `64000` | `text,image,pdf` | `ANTHROPIC_API_KEY` |
| `claude` | `claude-haiku-4-5-20251001` | A | B | `1` | `5` | `0.1` | `200000` | `64000` | `text,image,pdf` | `ANTHROPIC_API_KEY` |
| `gemini` | `gemini-3.1-pro-preview` | B | A | `2` | `12` | `0.2` | `1000000` | `64000` | `text,image,video,audio,pdf` | `GEMINI_API_KEY` |
| `gemini` | `gemini-3.1-flash-lite-preview` | B | A | `0.25` | `1.5` | `0.025` | `1000000` | `64000` | `text,image,video,audio,pdf` | `GEMINI_API_KEY` |
| `minimax` | `MiniMax-M2.1` | C | A | `0.3` | `1.2` | `0.03` | `204800` | `64000` | `text` | `MINIMAX_API_KEY` |
| `minimax` | `MiniMax-M2.1-lightning` | C | A | `0.3` | `2.4` | `0.03` | `204800` | `64000` | `text` | `MINIMAX_API_KEY` |
| `deepinfra` | `MiniMaxAI/MiniMax-M2.5` | C | A | `0.27` | `0.95` | `0.03` | `192000` | `64000` | `text` | `DEEPINFRA_API_KEY` |
| `grok` | `grok-4.20-0309-non-reasoning` | A | A | `2.0` | `6.0` | `0.2` | `2000000` | `128000` | `text,image` | `XAI_API_KEY` |
| `groq` | `openai/gpt-oss-20b` | A | B | `0.075` | `0.3` | `-` | `131072` | `65536` | `text` | `GROQ_API_KEY` |
| `groq` | `openai/gpt-oss-120b` | A | A | `0.15` | `0.6` | `-` | `131072` | `65536` | `text` | `GROQ_API_KEY` |
| `glm` | `glm-5` | C | A | `1` | `3.2` | `-` | `200000` | `128000` | `text` | `GLM_API_KEY` |

## Selection Example

```bash
-F "llmEnabled=true" \
-F "llmService=deepinfra" \
-F "llmModel=MiniMaxAI/MiniMax-M2.5" \
-F "selectedPrompts=shortSummary,bulletPoints"
```

## Notes

- Registry helper default: `openai` + `gpt-5.4-pro`
- The create flow preselects `groq` + `openai/gpt-oss-20b` for Step 3, but LLM generation stays off until the user enables it.
- The fallback chain in `run-llm.ts` now includes `deepinfra` alongside the existing providers.

## Security Context

- Models are invoked through processing jobs at [`POST /api/process`](../api/process.md).
- USD costs are estimated before the job is created.
- Outputs are available through global job and media APIs.
