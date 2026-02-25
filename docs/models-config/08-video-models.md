# Video Generation Models (Step 8)

AI video generation services for creating video content from prompts.

## Outline

- [Cost Rankings](#cost-rankings-per-second-of-video)
- [Notes](#notes)

---

## Cost Rankings (per second of video)

| Rank | Provider | Model                         | Time    | Speed | Resolution           | $/Sec | $/Min | Cents/Sec | Cents/Min | Env Variable          |
|------|----------|-------------------------------|---------|-------|----------------------|-------|-------|-----------|-----------|-----------------------|
| 1    | OpenAI   | sora-2                        | 79.00s  | B     | 720x1280; 1280x720   | $0.10 | $6    | 10¢       | 600¢      | `OPENAI_API_KEY`      |
| 2    | OpenAI   | sora-2-pro                    | TBD     | -     | 720x1280; 1280x720   | $0.30 | $18   | 30¢       | 1800¢     | `OPENAI_API_KEY`      |
| 3    | Google   | veo-3.1-fast-generate-preview | TBD     | -     | 720p                 | $0.35 | $21   | 35¢       | 2100¢     | `GEMINI_API_KEY`      |
| 4    | Google   | veo-3.1-generate-preview      | 36.78s  | A     | 720p/1080p/4K        | $0.40 | $24   | 40¢       | 2400¢     | `GEMINI_API_KEY`      |
| 5    | OpenAI   | sora-2-pro                    | TBD     | -     | 1024x1792; 1792x1024 | $0.50 | $30   | 50¢       | 3000¢     | `OPENAI_API_KEY`      |
| 6    | MiniMax  | T2V-01                        | 192.76s | C     | 720P                 | TBD   | TBD   | TBD       | TBD       | `MINIMAX_API_KEY`     |
| 7    | MiniMax  | T2V-01-Director               | TBD     | -     | 720P                 | TBD   | TBD   | TBD       | TBD       | `MINIMAX_API_KEY`     |
| 8    | MiniMax  | MiniMax-Hailuo-02             | TBD     | -     | 768P/1080P           | TBD   | TBD   | TBD       | TBD       | `MINIMAX_API_KEY`     |
| 9    | MiniMax  | MiniMax-Hailuo-2.3            | TBD     | -     | 768P/1080P           | TBD   | TBD   | TBD       | TBD       | `MINIMAX_API_KEY`     |
| 10   | Grok     | grok-imagine-video            | 26.74s  | A     | 720p/480p            | TBD   | TBD   | TBD       | TBD       | `XAI_API_KEY`         |

## Notes

- **Use async workflows** for all video generation
- **Grok Video:** Fastest at 26.74s with good quality
- **Gemini Veo 3.1:** Fast at 36.78s, 1080p and 4K only available for 8s duration
- **OpenAI Sora 2:** 79.00s generation time with high quality
- **MiniMax T2V-01:** Slowest at 192.76s but supports longer videos
- **MiniMax Hailuo 2.3:** Latest flagship with camera controls
- **Video is production-ready:** All options practical for async workflows
