<div align="center">
  <h1>AutoShow</h1>
  <img alt="autoshow logo" src="https://ajc.pics/autoshow/autoshow-cover-01.webp" width="300" />
</div>

## Outline

- [Project Overview](#project-overview)
- [Features](#features)
- [Quick Start](#quick-start)
  - [Test URLs](#test-urls)
  - [Install Dependencies](#install-dependencies)
  - [Run Type Check](#run-type-check)
  - [Start Docker Container](#start-docker-container)
  - [CLI Helpers](#cli-helpers)
- [Running Tests](#running-tests)
- [Docker Commands](#docker-commands)
  - [Start Services](#start-services)
  - [Prune Docker Resources](#prune-docker-resources)
  - [Display Service Information](#display-service-information)
  - [Analyze Docker Image](#analyze-docker-image)
  - [Build Analysis](#build-analysis)

## Project Overview

AutoShow automates the processing of audio and video content from various sources, including YouTube videos, playlists, podcast RSS feeds, and local media files. It leverages advanced transcription services and language models (LLMs) to perform transcription, summarization, chapter generation, text-to-speech, image generation, music generation, and video generation.

Currently there's three pieces:

- [`autoshow-cli`](https://github.com/autoshow/autoshow-cli) which provides the widest set of functionality including text, image, speech, music, and video generation capabilities.
- [`autoshow.app`](https://autoshow.app/) which provides a paid product version of the AutoShow CLI functionality (with some modalities currently in development) and doesn't require technical expertise to use.
- [`autoshow`](https://github.com/autoshow/autoshow) which is the repo you're on now that splits the difference and gives an open source, local development experience that also has a frontend UI that you can host yourself.

The whole AutoShow project started with this repo and eventually split off into the dedicated CLI repo and the private repo behind the product.

## Features

- **Audio Processing**: Extract audio from YouTube videos, streaming platforms, or direct file uploads
- **AI Transcription**: Groq Whisper or HappyScribe with automatic speaker diarization
- **LLM Summarization**: OpenAI GPT, Anthropic Claude, or Google Gemini models for generating episode descriptions, summaries, and chapters
- **Text-to-Speech**: Convert summaries to audio with OpenAI or ElevenLabs voices
- **Image Generation**: Create cover images from AI-generated prompts
- **Music Generation**: Generate background music with ElevenLabs in multiple genres
- **Docker Support**: Containerized deployment with analysis and optimization tools
- **Build Analysis**: Analyze and optimize SolidStart bundle size and performance

## Quick Start

### Test URLs

- Video: https://www.youtube.com/watch?v=nXtaETBZ29g
- Direct URL: https://ajc.pics/audio/fsjam-short.mp3
- Local file: .github/1.mp3

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
bun up
```

Visit http://localhost:4321 to generate show notes through the web interface.

### CLI Helpers

```bash
bun as help
bun as --help
bun as -h
```

Generate repository context file with Repomix:

```bash
bun repo
```

Modify `INCLUDE_PATHS` and `IGNORE_PATHS` in `.github/repomix.sh` to customize Repomix context file output.

## Running Tests

```bash
bun test
```

E2E tests spin up an isolated Docker container with a fresh SQLite database and run actual HTTP requests against the API. Requires valid API keys in `.env` (GROQ_API_KEY, OPENAI_API_KEY).

## Docker Commands

### Start Services

```bash
# Start services (faster, uses existing state)
bun up

# Prune Docker resources then start services (recommended for clean builds)
bun up prune
```

The `up` command will:
1. Build and start the Docker Compose services (use `bun up prune` to clean Docker resources first)
2. Follow the logs for the `autoshow` service

### Prune Docker Resources

```bash
# Remove all Docker containers, images, volumes, and networks
bun run prune
```

### Display Service Information

```bash
# Show comprehensive Docker Compose information
bun in
```

### Analyze Docker Image

```bash
# Analyze the default image
bun docker-report

# Analyze a specific image
bun docker-report config-autoshow
```

### Build Analysis

```bash
# Analyze SolidStart build for optimization opportunities
bun build-report
```