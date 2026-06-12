# autoshow-bun

## Overview

Full-stack application for automatically processing videos and audio with AI transcription, summarization, text-to-speech, image generation, and music generation.

## Features

- **Audio Processing**: Extract audio from YouTube videos, streaming platforms, or direct file uploads
- **AI Transcription**: Groq Whisper, DeepInfra, YouTube Captions, or HappyScribe with automatic speaker diarization
- **LLM Summarization**: OpenAI GPT, Claude, or Google Gemini models for generating episode descriptions, summaries, and chapters
- **Text-to-Speech**: Convert summaries to audio with OpenAI or ElevenLabs voices
- **Image Generation**: Create cover images from AI-generated prompts
- **Music Generation**: Generate background music with ElevenLabs in multiple genres
- **Operational Logging**: Structured JSON logs in production with request IDs, severity levels, and optional HTTP log drain forwarding
- **Docker Support**: Containerized deployment with image reporting tools

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

### Start Docker Container

```bash
bun as docker up
```

Visit the URL printed by the CLI to generate show notes through the web interface. The default is http://localhost:4321.
If port `4321` is already in use, `bun as docker up` prints the fallback URL it selected, or you can pin one with `AUTOSHOW_DOCKER_HOST_PORT=4322`.

## Agent Discovery

- `/llms.txt` - plain-text overview of public AutoShow pages
- `/sitemap.md` - markdown index of public AutoShow pages

## Documentation

### CLI Commands
- [Overview](docs/cli/01-overview.md) - CLI commands and usage
- [Configuration](docs/cli/02-config.md) - Environment setup and API keys
- [Docker](docs/cli/03-docker.md) - Container management
- [Help](docs/cli/07-help.md) - Help output and version flags

### API Documentation
- [Overview](docs/api/README.md) - API endpoints and usage
- [Health](docs/api/health.md) - Health check endpoint
- [Jobs](docs/api/jobs.md) - Job management
- [Models](docs/api/models.md) - Available AI models
- [Process](docs/api/process.md) - Multi-step processing pipeline
- [Download](docs/api/download/) - File upload endpoints
- [Media](docs/api/media/) - Audio, image, and video processing

### Testing
- [Runner](docs/tests/03-unit-api-security.md) - E2E and browser runner entrypoint, flags, and artifacts
- [E2E Testing](docs/tests/02-e2e.md) - Definition-driven E2E modes, inputs, and reports
- [Playwright Browser Tests](docs/tests/01-playwright.md) - Browser UI suite and artifacts

### Architecture
- [Models & Configuration](docs/models-config/01-overview.md) - All models, pricing, performance, and env vars
- [Steps Architecture](docs/steps-diagrams/01-steps-architecture-diagram.md) - Processing pipeline
- [Progress Tracking](docs/steps-diagrams/02-progress-tracking-architecture.md) - Progress system
- [Cost Estimation](docs/steps-diagrams/05-cost-estimation-diagram.md) - Provider cost estimates and runtime totals
