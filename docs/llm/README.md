# LLM Provider Configuration

AutoShow supports multiple LLM providers for text generation.

## Supported Providers

| Provider | Models | Environment Variable |
|----------|--------|---------------------|
| OpenAI | GPT-5, GPT-5-mini, GPT-5-nano, GPT-5.1, GPT-5.2, GPT-5.2-pro | `OPENAI_API_KEY` |
| Anthropic | Claude Sonnet 4.5, Claude Opus 4.5, Claude Haiku 4.5 | `ANTHROPIC_API_KEY` |
| Google | Gemini 3 Pro, Gemini 3 Flash | `GEMINI_API_KEY` |

## Model Details

### OpenAI Models

| Model ID | Name | Speed | Quality |
|----------|------|-------|---------|
| gpt-5 | GPT-5 | B | A |
| gpt-5-mini | GPT-5 Mini | A | B |
| gpt-5-nano | GPT-5 Nano | A | C |
| gpt-5.1 | GPT-5.1 | B | A |
| gpt-5.2 | GPT-5.2 | B | A |
| gpt-5.2-pro | GPT-5.2 Pro | C | A |

### Anthropic Models

| Model ID | Name | Speed | Quality |
|----------|------|-------|---------|
| claude-sonnet-4-5-20250929 | Claude Sonnet 4.5 | A | A |
| claude-opus-4-5-20251101 | Claude Opus 4.5 | B | A |
| claude-haiku-4-5-20251001 | Claude Haiku 4.5 | A | B |

### Google Gemini Models

| Model ID | Name | Speed | Quality |
|----------|------|-------|---------|
| gemini-3-pro-preview | Gemini 3 Pro | B | A |
| gemini-3-flash-preview | Gemini 3 Flash | A | A |

## Adding a New Provider

1. Add provider type to `src/types/services.ts` (`LLMServiceTypeSchema`)
2. Add configuration to `src/utils/services.ts` (`SERVICES_CONFIG.llm`)
3. Create service file in `src/routes/api/process/04-run-llm/llm-services/`
4. Update routing in `src/routes/api/process/04-run-llm/run-llm.ts`
5. Update database CHECK constraint in `src/database/db.ts`
6. Update types in `src/types/shownote.ts`
7. Add environment variable to `.env.example` and `.github/docker-compose.yml`
8. Update documentation
