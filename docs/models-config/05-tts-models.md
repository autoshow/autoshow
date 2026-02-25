# TTS Models (Step 5)

Text-to-speech services for generating audio narration from show notes.

## Outline

- [Cost Rankings](#cost-rankings)
- [Notes](#notes)

---

Rule of thumb: **1,000 characters ≈ 1 minute of audio**

## Cost Rankings

| Rank | Provider   | Model                         | Time  | Speed | $/Min  | Cents/Min | Centicents/Min | Env Variable           |
|------|------------|-------------------------------|-------|-------|--------|-----------|----------------|------------------------|
| 1    | OpenAI     | gpt-4o-mini-tts               | 2.89s | A     | $0.015 | 1.50¢     | 150            | `OPENAI_API_KEY`       |
| 2    | Groq       | canopylabs/orpheus-v1-english | 1.91s | A+    | $0.022 | 2.20¢     | 220            | `GROQ_API_KEY`         |
| 3    | ElevenLabs | eleven_flash_v2_5 (plan)      | 1.49s | A+    | $0.11  | 11¢       | 1100           | `ELEVENLABS_API_KEY`   |
| 4    | ElevenLabs | eleven_turbo_v2_5 (plan)      | 1.49s | A+    | $0.11  | 11¢       | 1100           | `ELEVENLABS_API_KEY`   |
| 5    | ElevenLabs | eleven_flash_v2_5 (payg)      | 1.49s | A+    | $0.15  | 15¢       | 1500           | `ELEVENLABS_API_KEY`   |
| 6    | ElevenLabs | eleven_turbo_v2_5 (payg)      | 1.49s | A+    | $0.15  | 15¢       | 1500           | `ELEVENLABS_API_KEY`   |

## Notes

- **Groq Orpheus:** Fastest at 1.91s with excellent pricing at $0.022/min
- **ElevenLabs:** Best quality with flash and turbo variants at 1.49s
- **ElevenLabs pricing:** $22/month plan includes 100k characters (about 200 minutes)
- **OpenAI gpt-4o-mini-tts:** Best price for pay-as-you-go at $0.015/min
- **Groq Orpheus:** $22/1M characters ($0.022/min at 1,000 chars/min)
