# Cost Estimation and Calculation

AutoShow stores provider costs in USD. The UI formats those values as cents for readability.

## Preview

`POST /api/process/preview` returns:

```json
{
  "breakdown": {
    "transcription": 0.0007,
    "document": 0,
    "llm": 0.0021,
    "tts": 0,
    "image": 0,
    "music": 0,
    "video": 0,
    "total": 0.0028
  }
}
```

There is no balance check and no payment-required response.

## Runtime

Runtime metadata records actual provider costs when a provider returns usage data. Missing runtime values fall back to the same estimator used by preview.

The final show-note row stores the aggregate in `show_notes.total_cost_usd`. Append-asset jobs add their final USD total to the existing show-note total.

## Modules

- `src/utils/cost/cost-estimation.ts` estimates per-step USD totals before work is dispatched.
- `src/utils/cost/final-cost.ts` combines actual runtime costs with estimates.
- `src/utils/cost-helpers.ts` formats USD values as cents labels for the UI.
