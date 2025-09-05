Hey Jace, thanks for checking out the project! The OS constraint is actually not super important on this repo, that's mostly a legacy thing from when the CLI was still integrated with this repo.

I've updated the setup script to try and make it more OS agnostic. I don't have a Windows machine so I can't really test it, but if you hit errors let me know what you got and we can work through them. Are you trying to run Windows proper or WSL?

Also, just a heads up that this repo is not currently receiving as much active development relative to the other parts of the AutoShow project. Currently there's three pieces:

- [`autoshow-cli`](https://github.com/autoshow/autoshow-cli) which provides the widest set of functionality including text, image, speech, music, and video generation capabilities.
- [`autoshow.app`](https://autoshow.app/) which provides a paid product version of the AutoShow CLI functionality (with some modalities currently in development) and doesn't require technical expertise to use.
- [`autoshow`](https://github.com/autoshow/autoshow) which is the repo you're on now that splits the difference and gives an open source, local development experience that also has a frontend UI that you can host yourself.

The whole AutoShow project started with this repo and eventually split off into the dedicated CLI repo and the private repo behind the product.

I would like to eventually upstream a lot of the functionality of the CLI and the paid app into this repo but unfortunately I'm already juggling an OSS repo and paid product between the other two so it's hard to find the time to keep development going on this one.

<div align="center">
  <h1>AutoShow</h1>
  <img alt="autoshow logo" src="https://ajc.pics/autoshow/autoshow-cover-01.webp" width="300" />
</div>

## Outline

- [Project Overview](#project-overview)
  - [Prompts and Content Formats](#prompts-and-content-formats)
  - [Key Features](#key-features)
  - [AutoShow Pipeline](#autoshow-pipeline)
- [Setup](#setup)
- [Run AutoShow](#run-autoshow)
- [Contributors](#contributors)

## Project Overview

AutoShow automates the processing of audio and video content from various sources, including YouTube videos, playlists, podcast RSS feeds, and local media files. It leverages advanced transcription services and language models (LLMs) to perform transcription, summarization, and chapter generation.

### Prompts and Content Formats

AutoShow can generate diverse content formats including:

- **Summaries and Chapters:**
  - Concise summaries
  - Detailed chapter descriptions
  - Bullet-point summaries
  - Chapter titles with timestamps
- **Social Media Posts:**
  - X (Twitter)
  - Facebook
  - LinkedIn
- **Creative Content:**
  - Rap songs
  - Rock songs
  - Country songs
- **Educational and Informative Content:**
  - Key takeaways
  - Comprehension questions
  - Frequently asked questions (FAQs)
  - Curated quotes
  - Blog outlines and drafts

### Key Features

- Support for multiple input types (YouTube links, local video and audio files)
- Integration with various:
  - LLMs (ChatGPT, Claude, Gemini)
  - Transcription services (Deepgram, Assembly)
- Customizable prompts for generating titles, summaries, chapter titles/descriptions, key takeaways, and questions to test comprehension
- Markdown output with metadata and formatted content

### AutoShow Pipeline

The AutoShow workflow includes the following steps that feed sequentially into each other:

1. The user provides a content input (video URL or local file) and front matter is created based on the content's metadata.
2. The audio is downloaded (if necessary).
3. Transcription is performed using the selected transcription service.
4. A customizable prompt is inserted containing instructions for the show notes or other content forms.
5. The transcript is processed by the selected LLM service to generate the desired output based on the selected prompts.

## Setup

`.github/setup.sh` checks to ensure a `.env` file exists and Node dependencies are installed. Run the workflow with the `setup` script in `package.json`.

```bash
npm run setup
```

## Run AutoShow

Example commands for all available options can be found in [`docs/README.md`](/docs/README.md).

```bash
npm run dev
```

Open [localhost:4321](http://localhost:4321/).

## Contributors

- ✨Hello beautiful human! ✨[Jenn Junod](https://jennjunod.dev/) host of [Teach Jenn Tech](https://teachjenntech.com/) & [Shit2TalkAbout](https://shit2talkabout.com)
