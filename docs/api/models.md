# Models API

List all available models from configured AI services.

## Outline

- [Endpoint](#endpoint)
- [Description](#description)
- [Access](#access)
- [Response](#response)
  - [Success Response](#success-response)
  - [Error Response (Service Unavailable)](#error-response-service-unavailable)
  - [Error Response (Server Error)](#error-response-server-error)
- [Model Schemas](#model-schemas)
  - [OpenAI Model](#openai-model)
  - [Claude Model](#claude-model)
  - [Gemini Model](#gemini-model)
  - [Groq Model](#groq-model)
  - [ElevenLabs Model](#elevenlabs-model)
  - [models.dev Model](#modelsdev-model)
- [Example](#example)
  - [cURL](#curl)
  - [JavaScript](#javascript)

## Endpoint

```
GET /api/models
```

## Description

Fetches available models from all configured AI services in parallel. Each service returns its models along with service-specific metadata. If a service's API key is not configured or the request fails, the response includes an error message for that service while other services continue to work.

## Access

No endpoint access control is required. Each service still needs its API key configured as an environment variable:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `ELEVENLABS_API_KEY`

The `modelsDev` service fetches from `https://models.dev/api.json` and does not require an API key.

## Response

### Success Response

**Status Code:** `200 OK`

```json
{
  "openai": {
    "models": [
      {
        "id": "gpt-4o",
        "object": "model",
        "created": 1715367049,
        "owned_by": "system"
      }
    ]
  },
  "claude": {
    "models": [
      {
        "id": "claude-sonnet-4-20250514",
        "created_at": "2025-05-14T00:00:00Z",
        "display_name": "Claude Sonnet 4",
        "type": "model"
      }
    ]
  },
  "gemini": {
    "models": [
      {
        "name": "models/gemini-2.0-flash",
        "version": "2.0",
        "displayName": "Gemini 2.0 Flash",
        "description": "Fast and versatile multimodal model",
        "inputTokenLimit": 1048576,
        "outputTokenLimit": 8192,
        "supportedActions": ["generateContent"],
        "thinking": false,
        "temperature": 1.0,
        "maxTemperature": 2.0,
        "topP": 0.95,
        "topK": 40
      }
    ]
  },
  "groq": {
    "models": [
      {
        "id": "llama-3.3-70b-versatile",
        "object": "model",
        "created": 1693721698,
        "owned_by": "Meta",
        "active": true,
        "context_window": 131072,
        "public_apps": null
      }
    ]
  },
  "elevenlabs": {
    "models": [
      {
        "model_id": "eleven_multilingual_v2",
        "name": "Eleven Multilingual v2",
        "can_be_finetuned": true,
        "can_do_text_to_speech": true,
        "can_do_voice_conversion": true,
        "can_use_style": true,
        "can_use_speaker_boost": true,
        "serves_pro_voices": false,
        "token_cost_factor": 1.0,
        "description": "State-of-the-art multilingual model",
        "requires_alpha_access": false,
        "max_characters_request_free_user": 500,
        "max_characters_request_subscribed_user": 10000,
        "maximum_text_length_per_request": 40000,
        "languages": [
          {
            "language_id": "en",
            "name": "English"
          }
        ],
        "model_rates": {
          "character_cost_multiplier": 1.0
        },
        "concurrency_group": "standard"
      }
    ]
  },
  "modelsDev": {
    "models": [
      {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "family": "GPT-4",
        "provider": "OpenAI",
        "attachment": true,
        "reasoning": false,
        "tool_call": true,
        "structured_output": true,
        "temperature": true,
        "knowledge": "2023-10",
        "release_date": "2024-05-13",
        "last_updated": "2024-05-13",
        "modalities": {
          "input": ["text", "image"],
          "output": ["text"]
        },
        "open_weights": false,
        "cost": {
          "input": 2.5,
          "output": 10
        },
        "limit": {
          "context": 128000,
          "output": 16384
        }
      }
    ]
  }
}
```

### Error Response (Service Unavailable)

When a service API key is not configured:

```json
{
  "openai": {
    "models": [],
    "error": "OPENAI_API_KEY not configured"
  },
  "claude": {
    "models": [...]
  },
  ...
}
```

### Error Response (Server Error)

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Error message"
}
```

## Model Schemas

### OpenAI Model

| Field      | Type   | Description                             |
|------------|--------|-----------------------------------------|
| `id`       | string | Model identifier (e.g., `gpt-4o`)       |
| `object`   | string | Object type, always `model`             |
| `created`  | number | Unix timestamp when model was created   |
| `owned_by` | string | Organization that owns the model        |

### Claude Model

| Field          | Type   | Description                                          |
|----------------|--------|------------------------------------------------------|
| `id`           | string | Model identifier (e.g., `claude-sonnet-4-20250514`)  |
| `created_at`   | string | RFC 3339 datetime when model was released            |
| `display_name` | string | Human-readable model name                            |
| `type`         | string | Object type, always `model`                          |

### Gemini Model

| Field              | Type     | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `name`             | string   | Resource name (e.g., `models/gemini-2.0-flash`)  |
| `version`          | string   | Model version number                             |
| `displayName`      | string   | Human-readable model name                        |
| `description`      | string   | Model description                                |
| `inputTokenLimit`  | number   | Maximum input tokens                             |
| `outputTokenLimit` | number   | Maximum output tokens                            |
| `supportedActions` | string[] | List of supported actions (optional)             |
| `thinking`         | boolean  | Whether model supports thinking (optional)       |
| `temperature`      | number   | Default temperature value (optional)             |
| `maxTemperature`   | number   | Maximum temperature value (optional)             |
| `topP`             | number   | Default nucleus sampling threshold (optional)    |
| `topK`             | number   | Default top-k sampling threshold (optional)      |

### Groq Model

| Field            | Type    | Description                                           |
|------------------|---------|-------------------------------------------------------|
| `id`             | string  | Model identifier (e.g., `llama-3.3-70b-versatile`)    |
| `object`         | string  | Object type, always `model`                           |
| `created`        | number  | Unix timestamp when model was created                 |
| `owned_by`       | string  | Organization that owns the model                      |
| `active`         | boolean | Whether model is currently active                     |
| `context_window` | number  | Maximum context window size                           |
| `public_apps`    | unknown | Public apps configuration                             |

### ElevenLabs Model

| Field                                    | Type    | Description                                        |
|------------------------------------------|---------|----------------------------------------------------|
| `model_id`                               | string  | Model identifier                                   |
| `name`                                   | string  | Model name (optional)                              |
| `can_be_finetuned`                       | boolean | Whether model can be finetuned (optional)          |
| `can_do_text_to_speech`                  | boolean | Whether model supports TTS (optional)              |
| `can_do_voice_conversion`                | boolean | Whether model supports voice conversion (optional) |
| `can_use_style`                          | boolean | Whether model can use style (optional)             |
| `can_use_speaker_boost`                  | boolean | Whether model can use speaker boost (optional)     |
| `serves_pro_voices`                      | boolean | Whether model serves pro voices (optional)         |
| `token_cost_factor`                      | number  | Cost factor for the model (optional)               |
| `description`                            | string  | Model description (optional)                       |
| `requires_alpha_access`                  | boolean | Whether alpha access is required (optional)        |
| `max_characters_request_free_user`       | number  | Max characters for free users (optional)           |
| `max_characters_request_subscribed_user` | number  | Max characters for subscribers (optional)          |
| `maximum_text_length_per_request`        | number  | Max text length per request (optional)             |
| `languages`                              | array   | Supported languages (optional)                     |
| `languages[].language_id`                | string  | Language identifier                                |
| `languages[].name`                       | string  | Language name                                      |
| `model_rates`                            | object  | Model rates configuration (optional)               |
| `model_rates.character_cost_multiplier`  | number  | Character cost multiplier                          |
| `concurrency_group`                      | string  | Concurrency group for the model (optional)         |

### models.dev Model

| Field               | Type     | Description                                         |
|---------------------|----------|-----------------------------------------------------|
| `id`                | string   | Model identifier (e.g., `gpt-4o`)                   |
| `name`              | string   | Human-readable model name                           |
| `family`            | string   | Model family (e.g., `GPT-4`)                        |
| `provider`          | string   | Provider name (e.g., `OpenAI`)                      |
| `attachment`        | boolean  | Whether model supports attachments                  |
| `reasoning`         | boolean  | Whether model supports reasoning                    |
| `tool_call`         | boolean  | Whether model supports tool calls                   |
| `structured_output` | boolean  | Whether model supports structured output            |
| `temperature`       | boolean  | Whether model supports temperature parameter        |
| `knowledge`         | string   | Knowledge cutoff date                               |
| `release_date`      | string   | Model release date                                  |
| `last_updated`      | string   | Last update date                                    |
| `modalities`        | object   | Input/output modalities                             |
| `modalities.input`  | string[] | Supported input types (e.g., `text`, `image`)       |
| `modalities.output` | string[] | Supported output types (e.g., `text`)               |
| `open_weights`      | boolean  | Whether model has open weights                      |
| `cost`              | object   | Pricing information                                 |
| `cost.input`        | number   | Input cost per million tokens                       |
| `cost.output`       | number   | Output cost per million tokens                      |
| `cost.cache_read`   | number   | Cache read cost per million tokens (optional)       |
| `limit`             | object   | Token limits                                        |
| `limit.context`     | number   | Maximum context window size                         |
| `limit.output`      | number   | Maximum output tokens                               |

## Example

### cURL

```bash
curl http://localhost:4321/api/models
```

### JavaScript

```javascript
const response = await fetch('http://localhost:4321/api/models')
const data = await response.json()

console.log('OpenAI models:', data.openai.models.length)
console.log('Claude models:', data.claude.models.length)
console.log('Gemini models:', data.gemini.models.length)
console.log('Groq models:', data.groq.models.length)
console.log('ElevenLabs models:', data.elevenlabs.models.length)
console.log('models.dev models:', data.modelsDev.models.length)
```
