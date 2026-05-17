# Music Generation Models (Step 4: Image, Video, and Music)

Music generation is currently configured for three providers.

## Outline

- [Current Registry](#current-registry)
- [Music Option Values](#music-option-values)
- [Selection Example](#selection-example)
- [Notes](#notes)
- [Security Context](#security-context)

## Current Registry

| Service | Model ID | Speed | Quality | Cost/Min | Supported Genres | Env Variable |
|---------|----------|-------|---------|----------|------------------|--------------|
| `elevenlabs` | `music_v1` | A | A | `$0.80` | `pop`, `rock`, `rap`, `country`, `folk`, `jazz` | `ELEVENLABS_API_KEY` |
| `minimax` | `music-2.5` | C | A | `$0.50` | `pop`, `rock`, `rap`, `country`, `electronic`, `jazz` | `MINIMAX_API_KEY` |
| `deapi` | `AceStep_1_5_Turbo` | B | B | `$0.10` | `pop`, `rock`, `rap`, `country`, `electronic`, `jazz` | `DEAPI_API_KEY` |

## Music Option Values

| Field | Allowed Values |
|------|----------------|
| `musicPreset` | `cheap`, `balanced`, `quality` |
| `musicDurationSeconds` | integer from `3` to `300` |
| `musicInstrumental` | `true` or `false` |
| `musicSampleRate` | `16000`, `24000`, `32000`, `44100` |
| `musicBitrate` | `32000`, `64000`, `128000`, `256000` |

## Selection Example

```bash
-F "musicGenEnabled=true" \
-F "musicService=deapi" \
-F "musicModel=AceStep_1_5_Turbo" \
-F "selectedMusicGenre=pop" \
-F "musicPreset=cheap" \
-F "musicDurationSeconds=60" \
-F "musicInstrumental=false"
```

## Notes

- Default music service: `elevenlabs`
- Default music model: `music_v1`
- When `musicInstrumental=false`, AutoShow uses the selected Step 3 LLM for lyric generation when available; otherwise it falls back to `openai` + `gpt-5.4`.
- The process form flag is `musicGenEnabled`.

## Security Context

- Music generation runs through processing jobs at [`POST /api/process`](../api/process.md).
- Output audio is served through global media APIs.
