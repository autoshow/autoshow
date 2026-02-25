import type { JSXElement } from "solid-js"
import { Title } from "@solidjs/meta"
import { onMount, onCleanup } from "solid-js"
import { MUSIC_CONFIG } from "~/models"
import s from "./home.module.css"
import Header from "./home/Header"
import Hero from "./home/Hero"
import FeatureSection from "./home/FeatureSection"
import Pipeline from "./home/Pipeline"
import FAQ from "./home/FAQ"
import Footer from "./home/Footer"

const uniqueValues = (values: string[]) => Array.from(new Set(values))

const joinWithOr = (values: string[]) => {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0] || ''
  if (values.length === 2) return `${values[0]} or ${values[1]}`
  const last = values[values.length - 1]
  return `${values.slice(0, -1).join(', ')}, or ${last}`
}

const MUSIC_SERVICES = Object.values(MUSIC_CONFIG)
const MUSIC_SERVICE_NAMES = joinWithOr(MUSIC_SERVICES.map(service => service.name))
const MUSIC_SERVICE_MODELS = MUSIC_SERVICES.map(service => `${service.name} (${service.model})`).join(', ')
const MUSIC_GENRE_NAMES = uniqueValues(MUSIC_SERVICES.flatMap(service => service.genres.map(genre => genre.name)))
const MUSIC_GENRE_DESCRIPTION = MUSIC_GENRE_NAMES.length > 0
  ? `${MUSIC_GENRE_NAMES.length} genres: ${MUSIC_GENRE_NAMES.join(', ')}`
  : 'multiple genres'

const TARGET_CARDS = [
  {
    title: "Audio / Video",
    description: "Podcast feed or episode, YouTube/Twitch/TikTok URL, MP3/MP4 file from your computer, or a direct URL to any public audio/video file.",
    category: "av" as const
  },
  {
    title: "Document",
    description: "PDF, EPUB, PPTX, or DOCX. Documents are backed up to S3 and extracted using LlamaParse or Mistral OCR vision models.",
    category: "doc" as const
  }
]

const TRANSCRIPTION_CARDS = [
  {
    title: "With Speaker Diarization",
    description: "Identify who said what with speaker labels and timestamps. Services include HappyScribe, AssemblyAI, Deepgram Nova-3, Soniox, Rev, Gladia, ElevenLabs Scribe, and Fal Whisper."
  },
  {
    title: "Fast Transcription",
    description: "Get rapid transcripts without speaker identification using Groq Whisper Large V3 Turbo or DeepInfra Whisper. Optimized for speed when speaker labels aren't needed."
  },
  {
    title: "Document Extraction",
    description: "Extract text from PDFs, images, and documents using LlamaParse for multi-page documents or Mistral OCR for vision-based text extraction."
  }
]

const LLM_CARDS = [
  {
    title: "Content Generation",
    description: "Create short summaries (180 chars), long summaries, bullet points, key takeaways, chapters with timestamps, FAQ sections, and custom prompt outputs."
  },
  {
    title: "Automatic Fallback",
    description: "3-attempt retry logic with provider fallback. If your selected model fails, AutoShow automatically tries alternate models and providers to ensure completion."
  }
]

const MEDIA_CARDS = [
  {
    title: "Text-to-Speech",
    description: "Convert summaries to narrated audio using OpenAI TTS, ElevenLabs, or Groq. Choose from multiple voices and output formats (WAV/MP3). OpenAI supports custom voice instructions."
  },
  {
    title: "AI Image Generation",
    description: "Create cover art, thumbnails, and promotional images using OpenAI DALL-E (gpt-image-1.5), Gemini, or MiniMax. Generate 1-3 images per job with customizable dimensions and aspect ratios."
  },
  {
    title: "Music Generation",
    description: `Generate original theme music with AI-written lyrics. Choose from ${MUSIC_GENRE_DESCRIPTION}. Powered by ${MUSIC_SERVICE_NAMES}.`
  },
  {
    title: "Video Generation",
    description: "Create explainer clips, highlights, intros, outros, and social media videos. Use OpenAI Sora (4-12s), Gemini Veo (up to 4K), or MiniMax Hailuo. All prompts include safety filtering."
  }
]

const SPEC_CARDS = [
  {
    title: "Transcription Services",
    description: "HappyScribe, AssemblyAI, Deepgram, Soniox, Rev, Gladia, ElevenLabs Scribe, Fal, Groq Whisper, and DeepInfra Whisper."
  },
  {
    title: "LLM Providers",
    description: "OpenAI (GPT-4o, GPT-4o-mini), Anthropic Claude (Sonnet, Haiku), Google Gemini (2.0 Flash, 1.5 Pro), Groq (Llama, Mixtral)."
  },
  {
    title: "TTS Services",
    description: "OpenAI TTS (gpt-4o-mini-tts, coral voice), ElevenLabs (eleven_flash_v2_5), Groq (canopylabs/orpheus-v1)."
  },
  {
    title: "Image Generation",
    description: "OpenAI DALL-E (gpt-image-1.5), Gemini (gemini-2.5-flash-image), MiniMax (image-01). Dimensions up to 1536x1024."
  },
  {
    title: "Music Generation",
    description: `${MUSIC_SERVICE_MODELS}. ${MUSIC_GENRE_NAMES.length} genres available.`
  },
  {
    title: "Video Generation",
    description: "OpenAI Sora (sora-2, sora-2-pro), Gemini Veo (veo-3.1, up to 4K), MiniMax Hailuo (Hailuo-2.3). Durations 4-12 seconds."
  },
  {
    title: "Cloud Storage",
    description: "S3-compatible storage with presigned URLs. All media automatically uploaded for persistent access. Supports Railway Storage Buckets."
  },
  {
    title: "Document Processing",
    description: "LlamaParse (PDF/DOCX to markdown), Mistral OCR (vision-based extraction). Supports PDF, DOCX, PNG, JPG, TIFF, TXT."
  }
]

const PIPELINE_STEPS = [
  { step: 1, title: "Download and Extract", description: "Audio extracted and converted to 16kHz WAV and 32k MP3. Documents backed up to S3. Video URLs passed directly to transcription." },
  { step: 2, title: "Transcribe", description: "Audio transcribed with timestamps. Long files auto-split into 10-minute segments. Documents extracted to markdown." },
  { step: 3, title: "Build Prompts", description: "Dynamic prompts assembled with metadata, transcript, and selected output types. JSON schemas generated for structured output." },
  { step: 4, title: "Generate Content", description: "LLM generates structured summaries, chapters, FAQs, and more. Automatic retry with provider fallback." },
  { step: 5, title: "Text-to-Speech", description: "Optional: Convert text output to narrated audio. Upload to S3 for persistent access." },
  { step: 6, title: "Generate Images", description: "Optional: Create AI images from title and text output. Multiple image types supported per job." },
  { step: 7, title: "Generate Music", description: "Optional: AI writes genre-specific lyrics, then composes original theme music (up to 3 minutes)." },
  { step: 8, title: "Generate Video", description: "Optional: AI writes scene descriptions, then renders video clips (4-12 seconds) with thumbnails." }
]

const FAQ_ITEMS = [
  {
    question: "What input formats are supported?",
    answer: "AutoShow supports video files (MP4, MOV, AVI), audio files (MP3, WAV, M4A), YouTube URLs, streaming URLs, direct file URLs, and documents (PDF, DOCX, PNG, JPG, TIFF, TXT)."
  },
  {
    question: "Which transcription service should I use?",
    answer: "For speaker identification, use HappyScribe, AssemblyAI, Deepgram, or ElevenLabs Scribe. For fastest results without speaker labels, use Groq Whisper or DeepInfra Whisper. HappyScribe is required for YouTube and streaming URLs."
  },
  {
    question: "How long can my content be?",
    answer: "There's no hard limit. Audio longer than 10 minutes is automatically split into segments with timestamp tracking. Each segment is transcribed separately and results are combined. Very long content (3+ hours) may take several minutes to process."
  },
  {
    question: "What LLM providers are available?",
    answer: "OpenAI (GPT-4o, GPT-4o-mini), Anthropic Claude (Sonnet, Haiku), Google Gemini (2.0 Flash, 1.5 Pro), and Groq (Llama, Mixtral). All support structured JSON output. If your selected provider fails, AutoShow automatically falls back to alternatives."
  },
  {
    question: "How does video generation work?",
    answer: "First, an LLM generates a detailed scene description based on your content. Then, the scene is rendered using OpenAI Sora (4-12s clips), Gemini Veo (up to 4K resolution), MiniMax Hailuo, or Grok. Video types include explainer, highlight, intro, outro, and social clips."
  },
  {
    question: "Where are generated files stored?",
    answer: "All files are saved locally in timestamped output directories. If S3 storage is configured (Railway Storage Buckets or any S3-compatible service), media files are also uploaded with presigned URLs for persistent access."
  },
  {
    question: "What music genres are available?",
    answer: "AutoShow supports 11 genres: rap, rock, pop, country, folk, jazz, ambient, electronic, cinematic, techno, and lofi. An LLM first writes original, copyright-safe lyrics tailored to your content, then the music is composed."
  }
]

export default function Home(): JSXElement {
  let sectionsRef: HTMLDivElement | undefined

  onMount(() => {
    if (!sectionsRef) return

    const fadeInUpClass = s.fadeInUp
    const visibleClass = s.visible
    if (!fadeInUpClass || !visibleClass) return

    const sections = sectionsRef.querySelectorAll(`.${fadeInUpClass}`)
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(visibleClass)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )

    sections.forEach((section) => observer.observe(section))

    onCleanup(() => observer.disconnect())
  })

  return (
    <div class={s.page}>
      <Title>AutoShow - AI-Powered Content Repurposing</Title>
      <Header />
      <Hero />

      <div ref={sectionsRef}>
        <FeatureSection
          class={s.fadeInUp}
          title="Choose a"
          accent="Target"
          subtitle="Your target is processed into text through transcription or document extraction. The text is then combined with prompts to generate text, audio, image, music, and video outputs."
          cards={TARGET_CARDS}
          columns={2}
        />

        <FeatureSection
          class={s.fadeInUp}
          title="Industry-Leading"
          accent="Transcription"
          subtitle="Choose from 10+ transcription services. Audio longer than 10 minutes is automatically split into segments with proper timestamp tracking and combined into a single transcript."
          cards={TRANSCRIPTION_CARDS}
          columns={3}
          altBg
        />

        <FeatureSection
          class={s.fadeInUp}
          title="Structured Output from"
          accent="4 LLM Providers"
          subtitle="Generate summaries, chapters, FAQs, takeaways, and more using OpenAI GPT-4, Claude, Gemini, or Groq. All providers support structured JSON output with automatic retry and fallback logic."
          cards={LLM_CARDS}
          columns={2}
        />

        <FeatureSection
          class={s.fadeInUp}
          title="AI-Powered"
          accent="Media Generation"
          subtitle="Go beyond transcription. Generate narrated audio, cover images, original music, and video clips from your content using the latest generative AI models."
          cards={MEDIA_CARDS}
          columns={2}
          altBg
        />

        <Pipeline class={s.fadeInUp} steps={PIPELINE_STEPS} />

        <FeatureSection
          class={s.fadeInUp}
          title="Technical"
          accent="Specifications"
          subtitle="Built for reliability and scale with enterprise-grade infrastructure."
          cards={SPEC_CARDS}
          columns={4}
        />

        <FAQ class={s.fadeInUp} items={FAQ_ITEMS} />

        <Footer class={s.fadeInUp} />
      </div>
    </div>
  )
}
