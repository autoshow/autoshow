import { writeStdout } from "./utils/terminal-output"

const HELP_TEXT = `
AutoShow CLI - Docker Utilities, Test Helpers, and Config Checks

Usage: bun as <command> [options]

Options:
  -h, --help                    Show help
  -v, --version                 Show version

Docker Commands:
  docker up                     Start Docker Compose services
  docker up prune               Run the full Docker prune sequence, then start services
  docker prune                  Run the full Docker prune sequence
  docker info                   Display Docker Compose service information
  docker report [image-name]    Analyze Docker image and generate optimization report

Runner Commands:
  runner                            Show runner help
  runner e2e                        Run E2E curated minimal suite
  runner browser                    Run Playwright browser suite
  runner e2e browser                Run multiple suites
  runner e2e --e2e-mode verify      Run E2E verify suite
  runner browser --e2e-mode verify  Run definition-driven Playwright verify suite
  runner e2e --e2e-mode minimalist  Run the ultra-small shared E2E suite
  runner e2e <paths...>             Run E2E on specific test paths (auto-detected)
  runner --grep <pattern>           Filter tests by name pattern
  runner --input <variant>          Input variant(s) for selected E2E definitions or explicit browser E2E mode
  runner --test-price               Print price estimates and exit for E2E or browser service cases
  runner --budget-cents <cents>     Skip E2E tests above per-test budget (in cents)
  runner --budget-centicent <cc>    Skip E2E tests above per-test budget (in 1/100th of a cent)

Config Commands:
  config                        Check all service configurations
  config resend                 Check and configure Resend (includes DNS)
  config google-drive           Configure Google Drive import

Examples:
  bun as help
  bun as docker up
  bun as docker up prune
  bun as docker prune
  bun as docker info
  bun as docker report
  bun as runner
  bun as runner --help
  bun as runner e2e browser
  bun as runner e2e --e2e-mode minimalist
  bun as runner e2e --e2e-mode verify
  bun as runner browser --e2e-mode minimal
  bun as runner browser --e2e-mode minimalist
  bun as runner browser --e2e-mode verify
  bun as runner e2e tests/test-definitions/verify/transcription
  bun as runner e2e --input 1m-streaming,2m-streaming tests/test-definitions/verify/transcription
  bun as runner e2e --input 1m-local,10m-direct 'tests/test-definitions/prompts/**/*.json'
  bun as runner e2e --test-price --budget-cents 1 tests/test-definitions/verify
  bun as runner e2e --budget-centicent 50 tests/test-definitions/verify
  bun as config
  bun as config resend
  bun as config google-drive

Note: Generate show notes through the web application at http://localhost:4321 by default.
If port 4321 is busy, Docker picks the next free host port or you can set AUTOSHOW_DOCKER_HOST_PORT.
`

export function showHelp(): void {
  writeStdout(HELP_TEXT.trim())
  process.exit(0)
}
