# Runner

`bun as runner` is the canonical test entrypoint for retained test suites. The runner now exposes only `e2e` and `browser`; bare `bun as runner` prints help and exits without running tests.

## Running

```bash
bun as runner
bun as runner --help
bun as runner e2e
bun as runner browser
bun as runner e2e browser
bun as runner e2e --grep "verify-llm"
bun as runner browser --grep "short summary"
bun run quality
```

## Unified Runner

The stable entrypoint is `scripts/test/run.ts`. CLI parsing, suite planning, command execution, and JUnit parsing live in adjacent modules under `scripts/test/`.

When the selected suites include `e2e` or `browser`, the runner starts one shared server, waits for `/api/health`, and passes suite-specific environment variables to the child runner.

Shared managed-server settings include:

- `NODE_ENV=test`
- `BASE_URL`

General runner flags:

- `--grep <pattern>` filters E2E definition names and Playwright titles
- `--test-price` prints E2E or browser price estimates without launching a server

Suite-specific E2E and Playwright flags are documented in [02. E2E Suites](./02-e2e.md) and [01. Playwright Browser Tests](./01-playwright.md).

## Quality Gates

`bun run check` is the static TypeScript gate. `bun run quality` currently runs the same check.

Live E2E and browser suites are intentionally explicit because they can start servers, use provider credentials, and create artifacts.

## Output Artifacts

Each unified `bun as runner ...` execution writes to `artifacts/logs/test-runs/<runId>/`:

- `summary.json`
- `<suite>.log`
- `<suite>.junit.xml` for suites that emit JUnit
- `playwright-artifacts/` for browser output
