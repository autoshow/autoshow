# Transcription Models (Step 2)

The transcription registry is split into three families:

- `whisper` for direct file and hosted-file transcription without speaker labels
- `diarization` for speaker-aware transcription
- `streaming` for supported remote platform URLs

Speed grades below are the current `deriveSpeedLabel(...)` outputs from the registry's representative one-minute workload, not vendor marketing labels.

## Outline

- [Whisper Services](#whisper-services)
- [Diarization Services](#diarization-services)
- [Streaming URL Services](#streaming-url-services)
- [Selection Example](#selection-example)
- [Notes](#notes)

## Whisper Services

| Service | Model ID | Speed | Quality | Secs/Min | Cost/Min | Env Variable |
|---------|----------|-------|---------|----------|----------|--------------|
| `groq` | `whisper-large-v3-turbo` | A | B | `0.35` | `$0.00067` | `GROQ_API_KEY` |
| `groq` | `whisper-large-v3` | A | A | `0.37` | `$0.00185` | `GROQ_API_KEY` |
| `deepinfra` | `openai/whisper-large-v3-turbo` | B | B | `0.84` | `$0.00020` | `DEEPINFRA_API_KEY` |
| `deepinfra` | `openai/whisper-large-v3` | C | A | `1.00` | `$0.00045` | `DEEPINFRA_API_KEY` |

## Diarization Services

| Service | Model ID | Speed | Quality | Secs/Min | Cost/Min | Env Variable |
|---------|----------|-------|---------|----------|----------|--------------|
| `gladia` | `gladia-v2` | C | A | `0.50` | `$0.01000` | `GLADIA_API_KEY` |
| `assembly` | `universal-3-pro` | C | A | `0.70` | `$0.00350` | `ASSEMBLYAI_API_KEY` |
| `deepgram` | `nova-3` | A | A | `0.50` | `$0.00430` | `DEEPGRAM_API_KEY` |
| `soniox` | `stt-async-v4` | C | A | `1.00` | `$0.00167` | `SONIOX_API_KEY` |

## Streaming URL Services

| Service | Model ID | Speed | Quality | Secs/Min | Cost/Min | Env Variable |
|---------|----------|-------|---------|----------|----------|--------------|
| `happyscribe` | `happyscribe-auto` | C | B | `1.50` | `$0.01000` | `HAPPYSCRIBE_ORGANIZATION_ID`, `HAPPYSCRIBE_API_KEY` |
| `gladia` | `gladia-v2` | C | A | `0.50` | `$0.01000` | `GLADIA_API_KEY` |
| `deapi` | `whisper-large-v3` | B | A | `1.00` | `$0.00021` | `DEAPI_API_KEY` |
| `supadata` | `supadata-default` | C | A | `1.00` | `$0.01000` | `SUPADATA_API_KEY` |

## Selection Example

Uploaded-file transcription request:

```bash
-F "transcriptionOption=groq" \
-F "transcriptionModel=whisper-large-v3-turbo"
```

Remote streaming URL request:

```bash
-F "url=https://vimeo.com/example" \
-F "urlType=streaming" \
-F "transcriptionOption=supadata" \
-F "transcriptionModel=supadata-default"
```

## Notes

- The current helper default for direct-file transcription is `groq` + `whisper-large-v3-turbo`.
- The current helper default for streaming URLs is `happyscribe` + `happyscribe-auto`.
- The `whisper` bucket name is historical and now represents the plain-transcription family, not only literal Whisper models.
- DeepInfra model IDs that begin with `openai/whisper-*` are DeepInfra-hosted transcription models.
- `gladia` appears in both the diarization and streaming registries because the app supports both use cases.
