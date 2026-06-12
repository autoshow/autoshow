# Agent Instructions

## Verification To Run

- Prefer focused checks that match the files you changed.
- Run `bun run check` after TypeScript or Solid code changes.
- Run `bun run quality` only when the change is broad enough to justify the slower full static quality gate.

## Verification Not To Run

- Do not run Playwright browser tests.
- Do not run `bun run play`, `bun play`, `bunx playwright test`, or any command under `tests/playwright`.
- Do not run end-to-end suites or browser E2E suites.
- Do not run `bun as runner e2e`, `bun as runner browser`, `bun scripts/test/e2e.ts`, or any `--e2e-mode` test command.
- If a change would normally need Playwright or E2E coverage, add or update the test code when useful, but leave execution to the user and state that it was not run.

## Notes

- Keep existing user changes in the worktree intact. Do not revert unrelated files.
- Use `rg` for repo searches.
- Avoid starting long-running dev servers unless the user explicitly asks for one.
