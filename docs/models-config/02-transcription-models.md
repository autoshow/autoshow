# Transcription Models (Step 2)

Audio transcription services with speaker diarization and streaming support.

## Outline

- [Cost Rankings - Diarization](#cost-rankings---diarization)
- [Cost Rankings - No Diarization](#cost-rankings---no-diarization)
- [Performance Rankings](#performance-rankings-5-minute-audio)
- [Notes](#notes)

---

## Cost Rankings - Diarization

| Rank | Provider    | Model                  | $/Min     | $/Hour  | Cents/Hour | Cents/Min | Centicents/Min | Env Variable            |
|------|-------------|------------------------|-----------|---------|------------|-----------|----------------|-------------------------|
| 1    | Rev AI      | reverb-turbo           | $0.00166  | $0.10   | 10¢        | 0.16¢     | 16.67          | `REV_API_KEY`           |
| 2    | Soniox      | stt-async-v4           | $0.00166  | $0.10   | 10¢        | 0.16¢     | 16.67          | `SONIOX_API_KEY`        |
| 3    | AssemblyAI  | universal              | $0.0028   | $0.168  | 16.8¢      | 0.28¢     | 28.33          | `ASSEMBLYAI_API_KEY`    |
| 4    | Rev AI      | reverb                 | $0.00333  | $0.20   | 20¢        | 0.33¢     | 33.33          | `REV_API_KEY`           |
| 5    | Deepgram    | nova-3                 | $0.0043   | $0.258  | 25.8¢      | 0.43¢     | 43             | `DEEPGRAM_API_KEY`      |
| 6    | AssemblyAI  | slam-1                 | $0.0048   | $0.288  | 28.8¢      | 0.48¢     | 48.33          | `ASSEMBLYAI_API_KEY`    |
| 7    | ElevenLabs  | scribe_v2              | $0.008    | $0.48   | 48¢        | 0.8¢      | 80             | `ELEVENLABS_API_KEY`    |
| 8    | Gladia      | gladia-v2              | $0.01     | $0.60   | 60¢        | 1¢        | 100            | `GLADIA_API_KEY`        |
| 9    | HappyScribe | plan rate              | $0.01     | $0.60   | 60¢        | 1¢        | 100            | `HAPPYSCRIBE_API_KEY`   |
| 10   | Fal         | fal-ai/whisper         | $0.0165   | $0.99   | 99¢        | 1.65¢     | 165            | `FAL_API_KEY`           |

## Cost Rankings - No Diarization

| Rank | Provider    | Model                  | $/Min     | $/Hour  | Cents/Hour | Cents/Min | Centicents/Min | Env Variable            |
|------|-------------|------------------------|-----------|---------|------------|-----------|----------------|-------------------------|
| 1    | DeepInfra   | whisper-large-v3-turbo | $0.00020  | $0.012  | 1.2¢       | 0.02¢     | 2              | `DEEPINFRA_API_KEY`     |
| 2    | DeepInfra   | whisper-large-v3       | $0.00045  | $0.027  | 2.7¢       | 0.04¢     | 4.50           | `DEEPINFRA_API_KEY`     |
| 3    | Groq        | whisper-large-v3-turbo | $0.00066  | $0.040  | 3.96¢      | 0.06¢     | 6.66           | `GROQ_API_KEY`          |
| 4    | Groq        | whisper-large-v3       | $0.00185  | $0.111  | 11.1¢      | 0.185¢    | 18.50          | `GROQ_API_KEY`          |

## Performance Rankings (5-minute audio)

| Rank | Service     | Model                  | Time   | Secs/Min | Speed | Quality | Features                   |
|------|-------------|------------------------|--------|----------|-------|---------|----------------------------|
| 1    | Deepgram    | nova-3                 | 2.00s  | 0.40     | A+    | A       | Diarization, streaming     |
| 2    | Groq        | whisper-large-v3-turbo | 2.23s  | 0.45     | A+    | A       | Fast, reliable             |
| 3    | DeepInfra   | whisper-large-v3-turbo | 3.84s  | 0.77     | A     | A       | Best price                 |
| 4    | AssemblyAI  | universal              | 7.58s  | 1.52     | B     | A       | 99+ languages              |
| 5    | Soniox      | stt-async-v4           | 11.41s | 2.28     | C     | A       | Async only                 |
| 6    | Gladia      | gladia-v2              | 14.63s | 2.93     | C     | A       | 100+ languages             |
| 7    | ElevenLabs  | scribe_v2              | 22.98s | 4.60     | C     | A       | 48 speakers, 90+ langs     |
| 8    | Fal         | fal-ai/whisper         | 30.24s | 6.05     | D     | A       | GPU-based                  |
| 9    | Rev.ai      | rev-machine            | 66.52s | 13.30    | D     | A       | Human-quality              |
| 10   | HappyScribe | happyscribe            | 74.95s | 14.99    | D     | A       | Human-quality              |

## Notes

- **Groq minimum:** 10 seconds per request (short clips have higher effective $/min)
- **DeepInfra:** Best price-to-performance ratio
- **Groq scales well:** 0.83s/min (1-min) → 0.28s/min (10-min)
- **Deepgram:** Best for short clips (<5 min)
- **Features:** ElevenLabs, Gladia, AssemblyAI, Deepgram include diarization
