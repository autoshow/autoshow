# Music Generation Models (Step 7)

AI music generation services for creating background music and audio content.

## Outline

- [Cost Rankings](#cost-rankings-per-minute)
- [Performance Rankings](#performance-rankings)
- [Notes](#notes)

---

## Cost Rankings (per minute)

| Rank | Provider   | Model     | Time    | Speed | $/Min | $/Sec | Cents/Min | Centicents/Min | Env Variable         |
|------|------------|-----------|---------|-------|-------|-------|-----------|----------------|----------------------|
| 1    | ElevenLabs | music_v1  | 61.83s  | B     | $0.80 | $0.01 | 80¢       | 8000           | `ELEVENLABS_API_KEY` |
| 2    | MiniMax    | music-2.5 | 187.64s | C     | TBD   | TBD   | TBD       | TBD            | `MINIMAX_API_KEY`    |

## Performance Rankings

| Rank | Provider   | Style   | Time    | Speed | Quality | Features                  |
|------|------------|---------|---------|-------|---------|---------------------------|
| 1    | ElevenLabs | default | 61.83s  | B     | A       | Production-ready          |
| 2    | MiniMax    | default | 187.64s | C     | A       | Structured lyrics support |

## Notes

- **Use async workflows** for all music generation
- **ElevenLabs:** $0.80/min based on plan rate, 61.83s generation time
- **MiniMax:** Slower at 187.64s but supports structured lyrics with verse/chorus/bridge tags
