# Playwright Browser Tests

Playwright coverage lives in `tests/playwright/` and exercises the app through the browser UI.

## Outline

- [Current Specs](#current-specs)
- [Running](#running)
- [Wizard Screenshots](#wizard-screenshots)
- [Execution Model](#execution-model)
- [Price Estimates](#price-estimates)
- [Reports](#reports)

## Current Specs

- `tests/playwright/browser-e2e-definitions.spec.ts`
- `tests/playwright/browser-services.spec.ts`
- `tests/playwright/media-model-pickers.spec.ts`
- `tests/playwright/wizard-screenshots.spec.ts`

## Running

Direct Playwright runs:

```bash
bun play
bun play tests/playwright/browser-services.spec.ts --grep "process audio with groq"
bun play tests/playwright/browser-services.spec.ts --grep "^llm:"
bun play tests/playwright/browser-services.spec.ts --grep "^transcription:"
bun play tests/playwright/wizard-screenshots.spec.ts

AUTOSHOW_PLAYWRIGHT_E2E_MODE=minimal bun play tests/playwright/browser-e2e-definitions.spec.ts
AUTOSHOW_PLAYWRIGHT_E2E_MODE=minimalist bun play tests/playwright/browser-e2e-definitions.spec.ts
AUTOSHOW_PLAYWRIGHT_E2E_MODE=services bun play tests/playwright/browser-e2e-definitions.spec.ts
AUTOSHOW_PLAYWRIGHT_E2E_MODE=services2x bun play tests/playwright/browser-e2e-definitions.spec.ts
AUTOSHOW_PLAYWRIGHT_E2E_MODE=verify bun play tests/playwright/browser-e2e-definitions.spec.ts
AUTOSHOW_PLAYWRIGHT_E2E_MODE=services INPUT_VARIANTS=1m-streaming bun play tests/playwright/browser-e2e-definitions.spec.ts
```

Through the unified runner:

```bash
bun as runner browser
bun as runner browser tests/playwright/browser-services.spec.ts
bun as runner browser tests/playwright/wizard-screenshots.spec.ts
bun as runner browser --headed
bun as runner browser --grep "short summary"
bun as runner browser --test-price
bun as runner browser tests/playwright/browser-services.spec.ts --test-price
bun as runner browser --grep "groq" --test-price

bun as runner browser --e2e-mode minimal
bun as runner browser --e2e-mode minimalist
bun as runner browser --e2e-mode services
bun as runner browser --e2e-mode services2x
bun as runner browser --e2e-mode verify
bun as runner browser --e2e-mode verify --grep "verify-tts-openai"
bun as runner browser --e2e-mode services --input 1m-streaming
bun as runner browser --e2e-mode minimalist --test-price
bun as runner browser --e2e-mode minimal --test-price
```

`bun as runner browser` still runs the existing lightweight Playwright suite by default. Browser runs switch to the definition-driven Playwright E2E suite only when `--e2e-mode` is passed explicitly.
Browser `--e2e-mode` supports `minimal`, `minimalist`, `services`, `services2x`, `verify`, and `all`. It does not support `paths`, and it cannot be combined with explicit `.spec.ts` paths.

## Wizard Screenshots

Run the wizard screenshot spec when you need fresh UI captures for the create wizard:

```bash
bun play tests/playwright/wizard-screenshots.spec.ts
```

The spec opens `/create`, verifies the sample audio URL, walks the wizard through review, and saves full-page screenshots for desktop, iPad, and iPhone viewports.
It runs serially so all viewport captures for one invocation land in the same run directory.

Each invocation creates a new run directory. If another run already exists for the same minute, the new directory gets a numeric suffix such as `2026-05-13-2058-02`.
Cleanup keeps the newest two runs so the latest screenshots can be compared with the previous set.

Screenshots are written to:

```text
artifacts/test-results/playwright/wizard-screenshots/<run-timestamp>/<step>/
```

Each run groups screenshots by wizard step and prefixes each component state with its flow order:

```text
step-1/01-source-desktop.png
step-2/01-source-config-ipad.png
step-2/02-with-speaker-labels-iphone.png
step-5/01-review-iphone.png
```

Use `PLAYWRIGHT_BASE_URL` with `PLAYWRIGHT_DISABLE_WEBSERVER=1` to capture against an already-running app:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:4321 PLAYWRIGHT_DISABLE_WEBSERVER=1 bun play tests/playwright/wizard-screenshots.spec.ts
```

Direct `bun play` runs start their own managed test server by default. To intentionally reuse a server on `PLAYWRIGHT_BASE_URL`, set `PLAYWRIGHT_REUSE_EXISTING_SERVER=1`.

Use `--headed` when you want to watch the wizard while the captures are taken:

```bash
bun play tests/playwright/wizard-screenshots.spec.ts --headed
```

## Execution Model

Direct `bun play` runs use [`playwright.config.ts`](../../playwright.config.ts). By default that config starts `bun dev` as the Playwright web server, does not reuse an already-running server, blanks `RESEND_API_KEY`, and relies on the local/global app access model.

When browser tests run through `bun as runner browser`, the unified runner starts a shared server first and then sets:

- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_DISABLE_WEBSERVER=1`
- `PLAYWRIGHT_OUTPUT_DIR`
- `PLAYWRIGHT_JUNIT_REPORT`

The definition-driven Playwright spec resolves the same JSON-backed suites as `bun as runner e2e --e2e-mode ...`, applies the same `--input` variants, then drives the `/create` wizard through the browser for each resolved definition ID.

## Price Estimates

`bun as runner browser --test-price` does not launch Playwright.

- Without explicit `--e2e-mode`, the runner resolves the shared browser service matrix and prints a `Browser Test Price Estimate` table.
- With explicit `--e2e-mode`, the runner resolves the matching JSON-backed definition suite and prints the same `Test Price Estimate` table used by the Bun E2E runner.

Price-only browser runs:

- support the shared service matrix in `tests/playwright/browser-services.spec.ts` by default
- support the definition-driven browser suite when `--e2e-mode` is passed explicitly
- honor `--grep`
- honor explicit `.spec.ts` paths only for the default lightweight browser suite
- skip shared-server startup
- do not create Playwright reports, traces, or unified run artifacts

Use this mode when you want to estimate either the lightweight browser service matrix or the JSON-backed Playwright E2E suite before running the actual UI suite.

## Reports

Each Playwright helper run writes:

- `artifacts/logs/<timestamp>-playwright-<spec>-report.json`
- `artifacts/logs/<timestamp>-playwright-<spec>-poll.log`
- `project/reports/results/<timestamp>-playwright-<spec>-report.json`

Set `TEST_RUN_OUTPUT_DIR` to override the primary helper output directory for the JSON report and poll log. The JSON report is still mirrored into `project/reports/results/`. Unified browser runs also write `summary.json`, `browser.log`, `browser.junit.xml`, and `playwright-artifacts/` under `artifacts/logs/test-runs/<runId>/`.

`--test-price` is stdout-only and does not write the files above.
