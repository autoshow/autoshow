# CLI Overview

AutoShow exposes a helper CLI through the `as` package script:

```bash
bun as <command> [options]
```

Top-level commands are implemented in `scripts/cli.ts`. Each command now has its own doc file, with `runner` documented under the testing docs:

| Command | Docs | Purpose |
|---------|------|---------|
| `docker` | [Docker](./03-docker.md) | Compose lifecycle and image analysis |
| `runner` | [Runner](../tests/03-unit-api-security.md) | E2E and browser test runner docs |
| `config` | [Configuration Checks](./02-config.md) | Interactive Resend and Google Drive validation |
| `help` | [Help and Version](./07-help.md) | CLI help output and version flags |

## General Usage

```bash
bun as help
bun as --help
bun as --version
```

Use [Runner](../tests/03-unit-api-security.md), [Playwright Browser Tests](../tests/01-playwright.md), and [E2E Suites](../tests/02-e2e.md) for `bun as runner ...` examples and suite details.

## Common Examples

```bash
bun as docker up
bun as config
bun as help
```
