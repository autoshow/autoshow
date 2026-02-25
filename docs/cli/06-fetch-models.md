# Fetch Models

Update model definitions by fetching latest information from provider APIs.

## Outline

- [Usage](#usage)
- [What It Does](#what-it-does)
- [Model Files Updated](#model-files-updated)
- [Providers](#providers)
  - [LLM Providers](#llm-providers)
  - [Transcription Services](#transcription-services)
  - [TTS Services](#tts-services)
- [When to Run](#when-to-run)
- [Manual Updates](#manual-updates)
- [Verification](#verification)
- [Related Documentation](#related-documentation)

## Usage

```bash
bun as fetch-models
```

## What It Does

1. Fetches available models from provider APIs
2. Updates model definitions in `src/models/`
3. Verifies model availability
4. Updates pricing information (if available)

## Model Files Updated

- `src/models/llm-models.ts` - LLM provider models
- `src/models/transcription-models.ts` - Transcription service models
- `src/models/tts-models.ts` - Text-to-speech models
- `src/models/image-models.ts` - Image generation models
- `src/models/music-models.ts` - Music generation models

## Providers

### LLM Providers
- OpenAI
- Anthropic
- Google (Gemini)
- Groq
- Fireworks
- Together
- Mistral
- Cerebras
- xAI

### Transcription Services
- Groq (Whisper)
- DeepInfra
- Fal
- HappyScribe
- Gladia

### TTS Services
- OpenAI
- ElevenLabs

### Image Generation
- OpenAI
- Google (Gemini)
- MiniMax
- xAI (Grok)

### Music Generation
- ElevenLabs

## When to Run

- After provider releases new models
- When model names change
- To verify model availability
- Before major releases

## Manual Updates

If automatic fetch fails, manually update model files following existing patterns:

```typescript
export const LLM_MODELS = {
  OPENAI: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      maxTokens: 128000,
      contextWindow: 128000,
    },
  ],
}
```

## Verification

After updating models, verify they work:

```bash
bun test tests/verify.test.ts
```

## Related Documentation

- [LLM Services](../llm/README.md)
