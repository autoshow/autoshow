# LLM Models (Step 4)

Large language models for generating summaries, show notes, and content analysis.

## Outline

- [Cost Rankings](#cost-rankings-per-1m-tokens-5050-inputoutput)
- [Performance Rankings](#performance-rankings-prompt-benchmark-110-tests-22-prompts)
- [Model Details](#model-details)
  - [OpenAI Models](#openai-models)
  - [Claude Models](#claude-models)
  - [Google Gemini Models](#google-gemini-models)
  - [MiniMax Models](#minimax-models)
  - [Grok Models](#grok-models)
  - [Groq Models](#groq-models)
- [Notes](#notes)

---

## Cost Rankings (per 1M tokens, 50/50 input/output)

| Rank | Provider | Model                           | Blended $/1M | Avg $/1M | ¢/1K  | Centicents/1K | Env Variable          |
|------|----------|---------------------------------|--------------|----------|-------|---------------|-----------------------|
| 1    | Groq     | gpt-oss-20b                     | $0.37        | $0.18    | 0.01¢ | 1.87          | `GROQ_API_KEY`        |
| 2    | Grok     | grok-4-1-fast-non-reasoning     | $0.70        | $0.35    | 0.03¢ | 3.50          | `XAI_API_KEY`         |
| 3    | Groq     | gpt-oss-120b                    | $0.75        | $0.37    | 0.03¢ | 3.75          | `GROQ_API_KEY`        |
| 4    | MiniMax  | MiniMax-M2.1                    | $0.75        | $0.37    | 0.03¢ | 3.75          | `MINIMAX_API_KEY`     |
| 5    | MiniMax  | MiniMax-M2.1-lightning          | $1.35        | $0.67    | 0.07¢ | 6.75          | `MINIMAX_API_KEY`     |
| 6    | Google   | gemini-3-flash-preview          | $3.50        | $1.75    | 0.17¢ | 17.5          | `GEMINI_API_KEY`      |
| 7    | Claude   | claude-haiku-4-5                | $6           | $3       | 0.30¢ | 30            | `ANTHROPIC_API_KEY`   |
| 8    | OpenAI   | gpt-5.1                         | $11.25       | $5.62    | 0.56¢ | 56.25         | `OPENAI_API_KEY`      |
| 9    | Google   | gemini-3-pro-preview (≤200k)    | $14          | $7       | 0.70¢ | 70            | `GEMINI_API_KEY`      |
| 10   | OpenAI   | gpt-5.2                         | $15.75       | $7.87    | 0.78¢ | 78.75         | `OPENAI_API_KEY`      |
| 11   | Claude   | claude-sonnet-4-5               | $18          | $9       | 0.90¢ | 90            | `ANTHROPIC_API_KEY`   |
| 12   | Google   | gemini-3-pro-preview (>200k)    | $22          | $11      | 1.10¢ | 110           | `GEMINI_API_KEY`      |
| 13   | Claude   | claude-opus-4-5                 | $30          | $15      | 1.50¢ | 150           | `ANTHROPIC_API_KEY`   |
| 14   | OpenAI   | gpt-5.2-pro                     | $189         | $94.50   | 9.45¢ | 945           | `OPENAI_API_KEY`      |

## Performance Rankings (Prompt Benchmark: 110 tests, 22 prompts)

| Rank | Model                       | Provider | Avg Time | Speed | Avg Cost | Quality | Use Case                    |
|------|----------------------------|----------|----------|-------|----------|---------|------------------------------|
| 1    | gpt-oss-20b                | Groq     | 2.28s    | A+    | $0.00054 | B+      | High-volume, cost-sensitive |
| 2    | grok-4-1-fast-non-reasoning | Grok     | 6.20s    | A     | $0.00039 | A       | Best cost/quality balance   |
| 3    | claude-haiku-4-5           | Claude   | 7.98s    | A     | $0.00437 | A       | High quality, fast          |
| 4    | gemini-3-flash-preview     | Google   | 14.34s   | B     | $0.00152 | A       | Good for long context       |
| 5    | gpt-5.1                    | OpenAI   | 19.67s   | C     | $0.02163 | A+      | Premium quality             |

## Model Details

### OpenAI Models

| Model ID    | Name        | Speed | Quality | Input       | Output       |
|-------------|-------------|-------|---------|-------------|--------------|
| gpt-5.1     | GPT-5.1     | C     | A+      | $1.25/MTok  | $10/MTok     |
| gpt-5.2     | GPT-5.2     | C     | A+      | $1.75/MTok  | $14/MTok     |
| gpt-5.2-pro | GPT-5.2 Pro | D     | A+      | $21/MTok    | $168/MTok    |

### Claude Models

| Model ID                   | Name              | Speed | Quality | Input    | Output    |
|----------------------------|-------------------|-------|---------|----------|-----------|
| claude-haiku-4-5-20251001  | Claude Haiku 4.5  | A     | A       | $1/MTok  | $5/MTok   |
| claude-sonnet-4-5-20250929 | Claude Sonnet 4.5 | A     | A+      | $3/MTok  | $15/MTok  |
| claude-opus-4-5-20251101   | Claude Opus 4.5   | B     | A+      | $5/MTok  | $25/MTok  |

### Google Gemini Models

| Model ID               | Name           | Speed | Quality | Input            | Output            |
|------------------------|----------------|-------|---------|------------------|-------------------|
| gemini-3-flash-preview | Gemini 3 Flash | B     | A       | $0.50/MTok       | $3/MTok           |
| gemini-3-pro-preview   | Gemini 3 Pro   | C     | A+      | $2/MTok (≤200k)  | $12/MTok (≤200k)  |
| gemini-3-pro-preview   | Gemini 3 Pro   | C     | A+      | $4/MTok (>200k)  | $18/MTok (>200k)  |

### MiniMax Models

| Model ID                 | Name                    | Speed | Quality | Input       | Output      |
|--------------------------|-------------------------|-------|---------|-------------|-------------|
| MiniMax-M2.1             | MiniMax M2.1            | B     | A       | $0.30/MTok  | $1.20/MTok  |
| MiniMax-M2.1-lightning   | MiniMax M2.1 Lightning  | A     | A       | $0.30/MTok  | $2.40/MTok  |

### Grok Models

| Model ID                    | Name          | Speed | Quality | Input       | Output      |
|-----------------------------|---------------|-------|---------|-------------|-------------|
| grok-4-1-fast-non-reasoning | Grok 4.1 Fast | A     | A       | $0.20/MTok  | $0.50/MTok  |

### Groq Models

| Model ID            | Name         | Speed | Quality | Input        | Output      |
|---------------------|--------------|-------|---------|--------------|-------------|
| openai/gpt-oss-20b  | GPT OSS 20B  | A+    | B+      | $0.075/MTok  | $0.30/MTok  |
| openai/gpt-oss-120b | GPT OSS 120B | A     | A       | $0.15/MTok   | $0.60/MTok  |

## Notes

- **Benchmark methodology:** 110 tests across 22 prompts (creative writing, educational, business analysis, marketing, personal growth)
- **Test input:** 5-minute audio transcript (~400-650 input tokens depending on prompt)
- **All tests passed:** 100% success rate across all models and prompts
- **gpt-oss-20b:** Fastest and cheapest, best for high-volume workloads where quality tradeoff is acceptable
- **grok-4-1-fast-non-reasoning:** Best cost/quality balance - cheapest per request with high quality output
- **claude-haiku-4-5:** Upgraded to A quality based on benchmark results, excellent performance
- **gpt-5.1:** Highest quality but slowest and most expensive, premium tier for critical content
- **Gemini 3 Pro:** Higher pricing tier kicks in above 200k tokens
