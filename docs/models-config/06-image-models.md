# Image Generation Models (Step 6)

AI image generation services for creating thumbnails and visual assets.

## Outline

- [Cost & Performance Rankings](#cost--performance-rankings-per-image)
- [Notes](#notes)

---

## Cost & Performance Rankings (per image)

| Rank | Provider | Model                      | Time   | Speed | Cost    | Quality | Size       | Env Variable       |
|------|----------|----------------------------|--------|-------|---------|---------|------------|--------------------|
| 1    | MiniMax  | image-01                   | 1.17s  | A+    | $0.0035 | A       | -          | `MINIMAX_API_KEY`  |
| 2    | OpenAI   | gpt-image-1-mini           | 35.32s | C     | $0.005  | B       | 1024x1024  | `OPENAI_API_KEY`   |
| 3    | OpenAI   | gpt-image-1-mini           | TBD    | -     | $0.006  | B       | 1024x1536  | `OPENAI_API_KEY`   |
| 4    | OpenAI   | gpt-image-1.5              | TBD    | -     | $0.009  | A       | 1024x1024  | `OPENAI_API_KEY`   |
| 5    | Google   | gemini-2.5-flash-image     | 7.58s  | A     | $0.02   | B       | 1024px max | `GEMINI_API_KEY`   |
| 6    | Grok     | grok-imagine-image         | 4.10s  | A     | $0.02   | A       | -          | `XAI_API_KEY`      |
| 7    | Google   | gemini-3-pro-image-preview | TBD    | -     | $0.08   | A+      | up to 4K   | `GEMINI_API_KEY`   |

## Notes

- **Use async workflows** for all image generation
- **MiniMax:** Fastest and cheapest at 1.17s and $0.0035/image
- **Grok:** Excellent balance of speed (4.10s) and cost ($0.02)
- **Gemini Flash:** Good performance at 7.58s for $0.02
- **Quality levels (OpenAI):** Low/Medium/High affect both quality and price
- **OpenAI GPT-Image-1-Mini:** Slow at 35.32s despite low cost
