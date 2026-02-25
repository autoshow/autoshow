# Model Verification Suite

Tests every model/service integration with minimal cost using the smallest inputs and cheapest configurations.

## Outline

- [Quick Start](#quick-start)
- [Verification Tests Breakdown](#verification-tests-breakdown)
- [Minimal Service Suite](#minimal-service-suite-recommended-for-quick-checks)
- [Verify Base Suite](#verify-base-suite-cost-targeted-8-tests)
- [Top 5 Most Expensive Tests](#top-5-most-expensive-tests)
- [Cost Breakdown by Test](#cost-breakdown-by-test)
- [Minimal Service Coverage](#minimal-service-coverage-cheapest-model-per-service)

## Quick Start

```bash
bun test tests/verify.test.ts
```

This suite is designed to be run regularly to ensure all API integrations are working. It uses:
- **1-minute audio file** for all audio tests (smallest input)
- **1-page PDF** for document tests (smallest input)
- **Single prompt** (`shortSummary`) for LLM tests (minimal tokens)
- **Groq whisper-large-v3-turbo** as the cheap transcription base (free tier)
- **Groq gpt-oss-20b** as the cheap LLM base (free tier)
- **Each expensive model tested only once**

## Verification Tests Breakdown

| Category          | Tests | Models Covered                                                                                               | Est. Cost |
|-------------------|-------|--------------------------------------------------------------------------------------------------------------|-----------|
| Transcription     | 10    | Groq, DeepInfra, Fal, Gladia, HappyScribe, ElevenLabs, Rev, AssemblyAI, Deepgram, Soniox                  | $0.0724   |
| LLM               | 13    | OpenAI (3), Claude (3), Gemini (2), Groq (2), Grok (1), MiniMax (2)                                         | $0.3173   |
| Document Parsing  | 5     | LlamaParse (4), Mistral OCR (1)                                                                              | $0.0260   |
| TTS               | 4     | OpenAI, ElevenLabs (2), Groq                                                                                 | $0.1619   |
| Music Generation  | 2     | ElevenLabs, MiniMax                                                                                          | $0.0522+  |
| Image Generation  | 7     | OpenAI (3), Gemini (2), MiniMax (1), Grok (1)                                                               | $0.1305+  |
| Video Generation  | 4     | OpenAI Sora, Gemini Veo, MiniMax, Grok                                                                       | $2.00+    |
| Structured Output | 0     | (No standalone structured tests)                                                                             | $0.0000   |

**Total: 45 verification tests** | **Total Estimated Cost: ~$2.76+**

## Minimal Service Suite (Recommended for Quick Checks)

For a smaller subset that tests each service exactly once with the cheapest model:

```bash
bun test tests/verify.test.ts --grep "minimal-service"
```

**40 tests** | **~$2.22 estimated cost** - Tests one model per service, using the cheapest option available.

## Verify Base Suite (Cost-Targeted, 8 Tests)

For a highly targeted baseline suite distilled from verify + minimal-service coverage:

```bash
bun test tests/verify-base.test.ts
```

Or via tag filtering:

```bash
bun test tests/e2e.test.ts -- verify-base
```

| Test ID                                                  | Input                                         | Transcription / Document                  | LLM                                 | Extra Media | Est. Cost |
|----------------------------------------------------------|-----------------------------------------------|-------------------------------------------|-------------------------------------|-------------|-----------|
| verify-base-document-local-cheapest                      | `tests/test-input-files/1.pdf`                | `llamaparse / fast`                       | `groq / openai/gpt-oss-20b`         | none        | $0.0014   |
| verify-base-document-url-second-cheapest                 | `https://ajc.pics/autoshow/textract-1.pdf`    | `mistral-ocr / mistral-ocr-latest`        | `grok / grok-4-1-fast-non-reasoning`| none        | $0.0014   |
| verify-base-transcription-local-cheapest                 | `tests/test-input-files/1.mp3`                | `deepinfra / openai/whisper-large-v3-turbo` | `groq / openai/gpt-oss-20b`      | none        | $0.0006   |
| verify-base-transcription-url-second-cheapest            | `https://ajc.pics/autoshow/1.mp3`             | `groq / whisper-large-v3-turbo`           | `grok / grok-4-1-fast-non-reasoning`| none       | $0.0011   |
| verify-base-transcription-local-cheapest-tts             | `tests/test-input-files/1.mp3`                | `deepinfra / openai/whisper-large-v3-turbo` | `groq / openai/gpt-oss-20b`      | TTS only    | $0.0156   |
| verify-base-transcription-local-cheapest-image           | `tests/test-input-files/1.mp3`                | `deepinfra / openai/whisper-large-v3-turbo` | `groq / openai/gpt-oss-20b`      | Image only  | $0.0056   |
| verify-base-transcription-local-cheapest-music           | `tests/test-input-files/1.mp3`                | `deepinfra / openai/whisper-large-v3-turbo` | `groq / openai/gpt-oss-20b`      | Music only  | $0.5006   |
| verify-base-transcription-local-cheapest-video           | `tests/test-input-files/1.mp3`                | `deepinfra / openai/whisper-large-v3-turbo` | `groq / openai/gpt-oss-20b`      | Video only  | $0.2006   |

**Total estimated verify-base suite cost: ~$0.7269**

Single-test rerun commands:

```bash
bun test tests/e2e.test.ts -- verify-base-document-local-cheapest
bun test tests/e2e.test.ts -- verify-base-document-url-second-cheapest
bun test tests/e2e.test.ts -- verify-base-transcription-local-cheapest
bun test tests/e2e.test.ts -- verify-base-transcription-url-second-cheapest
bun test tests/e2e.test.ts -- verify-base-transcription-local-cheapest-tts
bun test tests/e2e.test.ts -- verify-base-transcription-local-cheapest-image
bun test tests/e2e.test.ts -- verify-base-transcription-local-cheapest-music
bun test tests/e2e.test.ts -- verify-base-transcription-local-cheapest-video
```

Why these models:
- Uses repo pricing/config as source of truth for cheapest/second-cheapest picks.
- Enforces different-service selection for the second document and transcription checks.
- Uses only `shortSummary` prompt to keep token usage minimal while still validating the end-to-end pipeline.
- Splits media validation into isolated TTS/image/music/video tests so failures are easier to attribute.

## Top 4 Most Expensive Tests

| Rank | Test                          | Primary Service                      | Est. Cost | % of Total |
|------|-------------------------------|--------------------------------------|-----------|------------|
| 1    | verify-video-gemini           | Gemini Veo ($0.35/sec)               | $1.40     | 30.2%      |
| 2    | verify-video-openai           | OpenAI Sora ($0.10/sec)              | $0.40     | 10.4%      |
| 3    | verify-video-minimax          | MiniMax T2V-01 (~$0.03/sec)          | $0.20     | 5.2%       |
| 4    | verify-llm-openai-gpt52pro    | GPT-5.2-Pro ($21/$168 per 1M tokens) | $0.19     | 4.9%       |

**These 4 tests account for most of the verification suite cost.**

## Cost Breakdown by Test

| Test                                       | Primary Service           | Est. Cost |
|--------------------------------------------|---------------------------|-----------|
| verify-transcription-deepinfra             | DeepInfra Whisper         | $0.0006   |
| verify-transcription-groq                  | Groq Whisper              | $0.0011   |
| verify-transcription-fal                   | Fal Whisper               | $0.0169   |
| verify-transcription-gladia                | Gladia V2                 | $0.0104   |
| verify-transcription-happyscribe           | HappyScribe               | $0.0104   |
| verify-llm-groq-gptoss20b                  | Groq GPT-OSS 20B          | $0.0011   |
| verify-llm-groq-gptoss120b                 | Groq GPT-OSS 120B         | $0.0015   |
| verify-llm-gemini-flash                    | Gemini 3 Flash            | $0.0042   |
| verify-llm-gemini-pro                      | Gemini 3 Pro              | $0.0147   |
| verify-llm-minimax-m21                     | MiniMax M2.1              | $0.0022   |
| verify-llm-minimax-m21lightning            | MiniMax M2.1 Lightning    | $0.0034   |
| verify-llm-claude-haiku                    | Claude Haiku 4.5          | $0.0067   |
| verify-llm-claude-sonnet                   | Claude Sonnet 4.5         | $0.0187   |
| verify-llm-claude-opus                     | Claude Opus 4.5           | $0.0307   |
| verify-llm-openai-gpt51                    | GPT-5.1                   | $0.0117   |
| verify-llm-openai-gpt52                    | GPT-5.2                   | $0.0167   |
| verify-llm-openai-gpt52pro                 | GPT-5.2-Pro               | $0.1897   |
| verify-document-llamaparse-fast            | LlamaParse Fast           | $0.0014   |
| verify-document-llamaparse-costeffective   | LlamaParse Cost Effective | $0.0034   |
| verify-document-llamaparse-agentic         | LlamaParse Agentic        | $0.0064   |
| verify-document-llamaparse-agenticplus     | LlamaParse Agentic Plus   | $0.0134   |
| verify-document-mistral-ocr                | Mistral OCR               | $0.0014   |
| verify-tts-openai                          | OpenAI TTS                | $0.0161   |
| verify-tts-elevenlabs                      | ElevenLabs TTS            | $0.1111   |
| verify-tts-groq                            | Groq Orpheus TTS          | $0.0231   |
| verify-music-elevenlabs                    | MiniMax Music (3s, cheap) | $0.0261   |
| verify-music-gemini                        | Gemini Lyria              | TBD       |
| verify-image-openai-gptimage1mini          | GPT-Image-1-Mini          | $0.0061   |
| verify-image-openai-gptimage15             | GPT-Image-1.5             | $0.0101   |
| verify-image-openai-gptimage1              | GPT-Image-1               | $0.0121   |
| verify-image-gemini-flash                  | Gemini 2.5 Flash Image    | $0.0211   |
| verify-image-gemini-pro                    | Gemini 3 Pro Image        | $0.0811   |
| verify-video-openai                        | OpenAI Sora               | $0.4011   |
| verify-video-gemini                        | Gemini Veo                | $1.4011   |
| verify-video-minimax                       | MiniMax T2V-01            | $0.2011   |
| verify-video-grok                          | Grok Video                | TBD       |
| verify-transcription-assembly              | AssemblyAI Universal      | $0.0011   |
| verify-transcription-rev                   | Rev AI                    | $0.0211   |
| verify-transcription-deepgram              | Deepgram Nova 3           | $0.0114   |
| verify-transcription-soniox                | Soniox Async              | $0.0011   |
| verify-transcription-elevenlabs            | ElevenLabs Scribe         | $0.0091   |
| verify-tts-elevenlabs-flash25              | ElevenLabs Flash 2.5      | $0.0077   |
| verify-llm-grok-41fast                     | Grok 4.1 Fast             | $0.0011   |
| verify-music-minimax                       | MiniMax Music (3s, cheap) | $0.0261   |

**Note:** Costs are estimates based on 1-minute audio input (~2K tokens for LLM) and single-page documents. Music verification tests now use a 3-second cheap MiniMax profile. Actual costs may vary based on output length and API pricing changes.

## Minimal Service Coverage (Cheapest Model Per Service)

Every service is tested with at least one test using its cheapest model:

| Service Category  | Service     | Cheapest Model       | Test File                        | Cost               |
|-------------------|-------------|----------------------|----------------------------------|--------------------|
| **Transcription** | DeepInfra   | whisper-large-v3-turbo | verify-transcription-deepinfra   | $0.0002/min        |
|                   | Groq        | whisper-large-v3-turbo | verify-transcription-groq        | $0.00066/min       |
|                   | Fal         | fal-ai/whisper       | verify-transcription-fal         | $1.65/min          |
|                   | Gladia      | gladia-v2            | verify-transcription-gladia      | $1.00/min          |
|                   | ElevenLabs  | scribe_v2            | verify-transcription-elevenlabs  | $0.80/min          |
|                   | Rev AI      | rev-machine          | verify-transcription-rev         | $2.00/min          |
|                   | AssemblyAI  | universal            | verify-transcription-assembly    | $0.2833/min        |
|                   | Deepgram    | nova-3               | verify-transcription-deepgram    | $0.43/min          |
|                   | Soniox      | stt-async-v4         | verify-transcription-soniox      | $0.1667/min        |
|                   | HappyScribe | happyscribe-auto     | verify-transcription-happyscribe | $1.00/min          |
| **LLM**           | Groq        | openai/gpt-oss-20b   | verify-llm-groq-gptoss20b        | $0.075/$0.3 per 1M |
|                   | Grok        | grok-4-1-fast        | verify-llm-grok-41fast           | $0.2/$0.5 per 1M   |
|                   | Gemini      | gemini-3-flash       | verify-llm-gemini-flash          | $0.5/$3 per 1M     |
|                   | Claude      | claude-haiku-4-5     | verify-llm-claude-haiku          | $1/$5 per 1M       |
|                   | MiniMax     | MiniMax-M2.1         | verify-llm-minimax-m21           | $0.3/$1.2 per 1M   |
|                   | OpenAI      | gpt-5.1              | verify-llm-openai-gpt51          | $1.25/$10 per 1M   |
| **TTS**           | ElevenLabs  | eleven_flash_v2_5    | verify-tts-elevenlabs-flash25    | ~$0.008/min        |
|                   | OpenAI      | gpt-4o-mini-tts      | verify-tts-openai                | $0.015/min         |
|                   | Groq        | orpheus-v1           | verify-tts-groq                  | ~$0.023/min        |
| **Image**         | Gemini      | gemini-2.5-flash     | verify-image-gemini-flash        | $0.02/image        |
|                   | OpenAI      | gpt-image-1-mini     | verify-image-openai-gptimage1mini | ~$0.006/image      |
|                   | MiniMax     | image-01             | verify-image-minimax             | varies             |
|                   | Grok        | grok-imagine-image   | verify-image-grok                | varies             |
| **Video**         | MiniMax     | T2V-01               | verify-video-minimax             | ~$0.03/sec         |
|                   | OpenAI      | sora-2               | verify-video-openai              | $0.10/sec          |
|                   | Grok        | grok-imagine-video   | verify-video-grok                | varies             |
|                   | Gemini      | veo-3.1-fast         | verify-video-gemini              | $0.35/sec          |
| **Music**         | MiniMax     | music-2.5            | verify-music-elevenlabs          | ~$0.025/run (3s)   |
|                   | MiniMax     | music-2.5            | verify-music-minimax             | ~$0.025/run (3s)   |
| **Document**      | LlamaParse  | fast                 | verify-document-llamaparse-fast  | ~$0.001/page       |
|                   | Mistral OCR | mistral-ocr-latest   | verify-document-mistral-ocr      | ~$0.001/page       |

✅ **Music verification tests are currently configured to the cheapest 3-second MiniMax profile.**
