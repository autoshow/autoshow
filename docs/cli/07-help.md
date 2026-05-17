# Help and Version

The CLI exposes help through both the `help` command and top-level flags.

## Usage

```bash
bun as help
bun as --help
bun as --version
```

## What It Covers

Top-level help currently prints:

- available commands
- Docker subcommands
- runner examples
- config subcommands

The output comes from `scripts/cli-help.ts`.

## Runner-Specific Help

For suite and flag details, use:

```bash
bun as runner --help
```

The current runner help includes E2E-specific flags like `--e2e-mode`, `--input`, `--concurrency`, and budget filters, plus browser flags like `--headed`.
When `--e2e-mode` is passed explicitly with `runner browser`, the browser runner switches from the default lightweight Playwright suite to the definition-driven Playwright E2E suite.

Canonical runner documentation lives in [Runner](../tests/03-unit-api-security.md), with suite details in [Playwright Browser Tests](../tests/01-playwright.md) and [E2E Suites](../tests/02-e2e.md).

## Related Files

- `scripts/cli.ts`
- `scripts/cli-help.ts`
- `scripts/test/run.ts`
