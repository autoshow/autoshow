export function showHelp(): void {
  console.log(`
AutoShow CLI - Docker Management & Build Analysis

Usage: bun as <command> [options]

Options:
  -h, --help                    Show help
  -v, --version                 Show version

Docker Commands:
  up                            Start Docker Compose services
  up prune                      Prune Docker resources then start services
  stop                          Stop Docker Compose services
  build                         Build Docker image
  build --no-cache              Build Docker image without cache
  start                         Start Docker containers
  logs                          Follow Docker container logs
  prune                         Remove all Docker containers, images, volumes, and networks
  info                          Display Docker Compose service information
  docker-report [image-name]    Analyze Docker image and generate optimization report

Build Analysis Commands:
  build-report                  Analyze SolidStart build for optimization opportunities

Model Commands:
  fetch-models                  Fetch LLM model info from models.dev API

Test Commands:
  e2e <paths...>                Run E2E tests for specified JSON test definitions
  analyze-logs                  Analyze test log files for performance stats

Config Commands:
  config                        Run available configuration checks

Examples:
  bun as up
  bun as up prune
  bun as stop
  bun as build
  bun as build --no-cache
  bun as start
  bun as logs
  bun as prune
  bun as info
  bun as docker-report
  bun as build-report
  bun as fetch-models
  bun as e2e tests/test-definitions/verify/verify-transcription-fal.json
  bun as analyze-logs
  bun as config

Note: To generate show notes, use the web application at http://localhost:4321
Run 'bun up' to start the development server or 'bun start' for production.
`)
  process.exit(0)
}
