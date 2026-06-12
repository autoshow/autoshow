import clsx from "clsx"
import { Link,Meta,Title } from "@solidjs/meta"
import { MUSIC_CONFIG } from "~/models"
import ui from "~/styles/ui.module.css"
import { getCanonicalSiteUrl } from "~/utils/site-url"
import s from "./home.module.css"
import FAQ from "./home/FAQ"
import FeatureSection from "./home/FeatureSection"
import Footer from "./home/Footer"
import Hero from "./home/Hero"
import Pipeline from "./home/Pipeline"

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
const MUSIC_SERVICE_MODELS = MUSIC_SERVICES.flatMap(service =>
  service.models.map(model => `${service.name} (${model.id})`)
).join(', ')
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
    description: "PDF, DOCX, PPTX, XLSX, TXT, PNG, JPG, or TIFF. Documents are backed up to S3 and extracted using OpenAI, Claude, Gemini, Grok, Mistral OCR, GLM OCR, or DeAPI OCR.",
    category: "doc" as const
  }
]

const TRANSCRIPTION_CARDS = [
  {
    title: "With Speaker Diarization",
    description: "Identify who said what with speaker labels and timestamps. Services include HappyScribe, AssemblyAI, Deepgram Nova-3, Soniox, Rev, and Gladia."
  },
  {
    title: "Fast Transcription",
    description: "Get rapid transcripts without speaker identification using Groq Whisper Large V3 Turbo or DeepInfra Whisper. Optimized for speed when speaker labels aren't needed."
  },
  {
    title: "Document Extraction",
    description: "Extract text from PDFs, Office files, images, and text documents using OpenAI, Claude, Gemini, Grok, Mistral OCR, GLM OCR, or DeAPI OCR."
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
    description: "Create explainer clips, highlights, intros, outros, and social media videos. Use Runway Gen-4.5, Gemini Veo (up to 4K), MiniMax Hailuo, Grok, GLM, DeepInfra, or deAPI. All prompts include safety filtering."
  }
]

const SPEC_CARDS = [
  {
    title: "Transcription Services",
    description: "YouTube Captions, HappyScribe, AssemblyAI, Deepgram, Soniox, Rev, Gladia, Groq Whisper, DeepInfra Whisper, Supadata, deAPI."
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
    description: "Runway Gen-4.5, Gemini Veo (veo-3.1, up to 4K), MiniMax Hailuo (Hailuo-2.3), Grok, GLM, DeepInfra, and deAPI. Durations vary by provider."
  },
  {
    title: "Cloud Storage",
    description: "S3-compatible storage with presigned URLs. All media automatically uploaded for persistent access. Supports Railway Storage Buckets."
  },
  {
    title: "Document Processing",
    description: "OpenAI, Claude, Gemini, Grok, Mistral OCR, GLM OCR, and DeAPI OCR. Supports PDF, DOCX, PPTX, XLSX, PNG, JPG, TIFF, and TXT."
  }
]

const PIPELINE_STEPS = [
  { step: 1, title: "Download and Extract", description: "Audio extracted and converted to 16kHz WAV and 32k MP3. Documents backed up to S3. Video URLs passed directly to transcription." },
  { step: 2, title: "Transcribe", description: "Audio transcribed with timestamps. Long files auto-split into 10-minute segments. Documents extracted to markdown." },
  { step: 3, title: "Write and TTS", description: "Dynamic prompts are assembled, the LLM generates structured outputs, and narration is optionally synthesized in the same stage." },
  { step: 4, title: "Image, Video, and Music", description: "Optional media runs in one grouped stage. Images use transcript text directly, while video and music can fall back to the auxiliary LLM when Step 3 is skipped." }
]

const FAQ_ITEMS = [
  {
    question: "What input formats are supported?",
    answer: "AutoShow supports audio files (MP3, WAV, M4A, FLAC, OGG, AAC, WMA, MPEG/MPGA), video files (MP4, MOV, AVI, MKV, WEBM, WMV, FLV, M4V), YouTube URLs, streaming URLs, direct file URLs, documents (PDF, DOCX, PPTX, XLSX, TXT), and images (PNG, JPG/JPEG, TIFF/TIF)."
  },
  {
    question: "Which transcription service should I use?",
    answer: "For speaker identification, use HappyScribe, AssemblyAI, Deepgram, Soniox, or Gladia. For fastest results without speaker labels, use Groq Whisper or DeepInfra Whisper. YouTube Captions is available at no transcription cost when a verified YouTube video exposes captions; otherwise use HappyScribe, Gladia, deAPI, or Supadata for streaming URLs."
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
    answer: "First, an LLM generates a detailed scene description based on your content. Then, the scene is rendered using Runway Gen-4.5, Gemini Veo (up to 4K resolution), MiniMax Hailuo, Grok, GLM, DeepInfra, or deAPI. Video types include explainer, highlight, intro, outro, and social clips."
  },
  {
    question: "Where are generated files stored?",
    answer: "All files are saved locally in timestamped directories under artifacts/output. If S3 storage is configured (Railway Storage Buckets or any S3-compatible service), media files are also uploaded with presigned URLs for persistent access."
  },
  {
    question: "What music genres are available?",
    answer: "AutoShow supports 11 genres: rap, rock, pop, country, folk, jazz, ambient, electronic, cinematic, techno, and lofi. An LLM first writes original, copyright-safe lyrics tailored to your content, then the music is composed."
  }
]

export default function Home() {
  const siteUrl = getCanonicalSiteUrl()

  const DESCRIPTION = 'AutoShow transforms audio, video, and documents into structured text, narrated audio, images, music, and video using 40+ AI models from OpenAI, Anthropic, Google, and more.'

  return (
    <div class={clsx(ui.page, s.page)}>
      <Title>AutoShow - AI-Powered Content Repurposing</Title>
      <Meta name="description" content={DESCRIPTION} />
      <Meta name="robots" content="index, follow" />
      <Link rel="canonical" href={`${siteUrl}/`} />
      <Link rel="icon" href="/brand/autoshow-logo.ico" />
      <Link rel="alternate" type="text/plain" href={`${siteUrl}/llms.txt`} title="Agent hint surface" />
      <Link rel="alternate" type="text/markdown" href={`${siteUrl}/sitemap.md`} title="Markdown discovery index" />

      {/* Open Graph */}
      <Meta property="og:type" content="website" />
      <Meta property="og:title" content="AutoShow - AI-Powered Content Repurposing" />
      <Meta property="og:description" content={DESCRIPTION} />
      <Meta property="og:url" content={`${siteUrl}/`} />
      <Meta property="og:site_name" content="AutoShow" />

      {/* Twitter */}
      <Meta name="twitter:card" content="summary" />
      <Meta name="twitter:title" content="AutoShow - AI-Powered Content Repurposing" />
      <Meta name="twitter:description" content={DESCRIPTION} />

      {/* JSON-LD */}
      <script type="application/ld+json" innerHTML={JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': 'AutoShow',
        'description': DESCRIPTION,
        'url': `${siteUrl}/`,
        'applicationCategory': 'MultimediaApplication',
        'operatingSystem': 'Web',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
          'description': 'Provider cost estimates before processing'
        },
        'featureList': [
          'Audio and video transcription with speaker diarization',
          'Document extraction (PDF, DOCX, PPTX, XLSX, images)',
          'LLM-powered summarization and content generation',
          'Text-to-speech with multiple voices',
          'AI image generation',
          'AI music generation with lyrics',
          'AI video generation'
        ]
      })} />

      <Hero />

      <div>
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
