# autoshow-bun

## Overview

Full-stack application for automatically processing videos and audio with AI transcription, summarization, text-to-speech, image generation, and music generation.

## Features

- **Audio Processing**: Extract audio from YouTube videos, streaming platforms, or direct file uploads
- **AI Transcription**: Groq Whisper, DeepInfra, Fal, Gladia, ElevenLabs, Rev, AssemblyAI, Deepgram, Soniox, or HappyScribe
- **LLM Summarization**: OpenAI GPT, Claude, or Google Gemini models for generating episode descriptions, summaries, and chapters
- **Text-to-Speech**: Convert summaries to audio with OpenAI or ElevenLabs voices
- **Image Generation**: Create cover images from AI-generated prompts
- **Music Generation**: Generate background music with ElevenLabs in multiple genres
- **Docker Support**: Containerized deployment with analysis and optimization tools
- **Build Analysis**: Analyze and optimize SolidStart bundle size and performance

## Quick Start

### Test URLs

```
https://www.youtube.com/watch?v=nXtaETBZ29g
https://ajc.pics/audio/fsjam-short.mp3
https://ajc.pics/autoshow/textract-3.pdf
```

### Install Dependencies

```bash
bun install
```

### Run Type Check

```bash
bun check
```

### Start Local Development Server

```bash
bun dev
```

Visit http://localhost:4321 to generate show notes through the web interface.

### Start Docker Container (Optional)

```bash
bun up
```

## Documentation

### CLI Commands
- [Overview](docs/cli/01-overview.md) - CLI commands and usage
- [Configuration](docs/cli/02-config.md) - Environment setup and API keys
- [Docker](docs/cli/03-docker.md) - Container management
- [Build Report](docs/cli/04-build-report.md) - Bundle analysis and optimization
- [E2E Testing](docs/cli/05-e2e.md) - End-to-end test suite
- [Fetch Models](docs/cli/06-fetch-models.md) - Update model definitions

### API Documentation
- [Overview](docs/api/README.md) - API endpoints and usage
- [Health](docs/api/health.md) - Health check endpoint
- [Jobs](docs/api/jobs.md) - Job management
- [Process](docs/api/process.md) - Multi-step processing pipeline
- [Download](docs/api/download/) - File upload endpoints
- [Media](docs/api/media/) - Audio, image, and video processing

### Testing
- [Overview](docs/tests/01-overview.md) - Testing strategy
- [Verify Tests](docs/tests/02-verify.md) - Model verification
- [E2E Tests](docs/tests/03-e2e.md) - End-to-end tests
- [API Tests](docs/tests/04-api.md) - API endpoint tests
- [Playwright Tests](docs/tests/05-playwright.md) - Browser tests

### Architecture
- [Models & Configuration](docs/models-config.md) - All models, pricing, performance, and env vars
- [Steps Architecture](docs/steps-diagrams/steps-architecture-diagram.md) - Processing pipeline
- [Progress Tracking](docs/steps-diagrams/progress-tracking-architecture.md) - Progress system
