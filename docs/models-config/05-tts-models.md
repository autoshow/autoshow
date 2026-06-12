# TTS Models (Step 3: Write and TTS)

The TTS registry in `src/models/models-config/tts-config.ts` tracks curated model ids, allowed voice ids, and per-million-character cost metadata.

## Outline

- [Current Registry](#current-registry)
- [Voice IDs](#voice-ids)
- [Selection Example](#selection-example)
- [Notes](#notes)
- [Security Context](#security-context)

## Current Registry

| Service | Model ID | Speed | Quality | Cost / 1M Chars | Voice Count | Example Voices | Env Variable |
|---------|----------|-------|---------|------------------|-------------|----------------|--------------|
| `openai` | `gpt-4o-mini-tts` | A | A | `$15` | `10` | `alloy`, `ash`, `coral` | `OPENAI_API_KEY` |
| `elevenlabs` | `eleven_flash_v2_5` | A | B | `$66` | `10` | `George`, `Adam`, `Bella` | `ELEVENLABS_API_KEY` |
| `elevenlabs` | `eleven_turbo_v2_5` | B | A | `$66` | `10` | `George`, `Adam`, `Bella` | `ELEVENLABS_API_KEY` |
| `deepgram` | `aura-2-thalia-en` | A | A | `$15` | `1` | `Thalia` | `DEEPGRAM_API_KEY` |
| `gemini` | `gemini-2.5-flash-preview-tts` | A | A | `$0.50` | `1` | `Aoede` | `GEMINI_API_KEY` |
| `grok` | `grok-tts-beta` | A | B | `$15` | `1` | `Eve` | `XAI_API_KEY` |
| `groq` | `canopylabs/orpheus-v1-english` | A | B | `$6` | `6` | `autumn`, `daniel`, `troy` | `GROQ_API_KEY` |
| `runway` | `eleven_multilingual_v2` | A | A | `$66` | `1` | `Leslie` | `RUNWAYML_API_SECRET` |
| `deapi` | `Kokoro` | A | B | `$2` | `1` | `Sky` | `DEAPI_API_KEY` |

## Voice IDs

### OpenAI

`alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`

### ElevenLabs

| Voice ID | Name |
|----------|------|
| `JBFqnCBsd6RMkjVDRZzb` | George |
| `pNInz6obpgDQGcFmaJgB` | Adam |
| `ErXwobaYiN019PkySvjV` | Antoni |
| `VR6AewLTigWG4xSOukaG` | Arnold |
| `EXAVITQu4vr4xnSDxMaL` | Bella |
| `IKne3meq5aSn9XLyUdCD` | Charlotte |
| `XB0fDUnXU5powFXDhCwa` | Clyde |
| `iP95p4xoKVk53GoZ742B` | Dave |
| `nPczCjzI2devNBz1zQrb` | Emily |
| `ThT5KcBeYPX3keUQqHPh` | Dorothy |

### Deepgram

`aura-2-thalia-en`

### Gemini

`Aoede`

### Grok

`eve`

### Groq

`autumn`, `diana`, `hannah`, `austin`, `daniel`, `troy`

### Runway

`Leslie`

### deAPI

`af_sky`

## Selection Example

Within a request that enables Step 3 writing:

```bash
-F "llmEnabled=true" \
-F "llmService=groq" \
-F "llmModel=openai/gpt-oss-20b" \
-F "selectedPrompts=shortSummary" \
-F "ttsEnabled=true" \
-F "ttsService=runway" \
-F "ttsModel=eleven_multilingual_v2" \
-F "ttsVoice=Leslie"
```

## Notes

- TTS reads `text-output.json` and currently narrates these Step 3 outputs when present: `shortSummary`, `longSummary`, `bulletPoints`, `takeaways`, and `faq`.
- The create flow currently initializes TTS to `openai` + `gpt-4o-mini-tts` + `coral`.
- The saved audio format can vary by provider. Show-note playback MIME is inferred from the generated file extension rather than branching on the service name.
- Some providers expose a single curated voice in the registry, while others expose a larger fixed voice list. The voice ids above are the source of truth for API submissions.

## Security Context

- TTS runs through processing jobs at [`POST /api/process`](../api/process.md).
- Generated audio is served through global media APIs.
