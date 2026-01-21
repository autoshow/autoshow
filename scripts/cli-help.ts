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
  prune                         Remove all Docker containers, images, volumes, and networks
  info                          Display Docker Compose service information
  docker-report [image-name]    Analyze Docker image and generate optimization report

Build Analysis Commands:
  build-report                  Analyze SolidStart build for optimization opportunities

Examples:
  bun as up
  bun as up prune
  bun as prune
  bun as info
  bun as docker-report
  bun as build-report

Note: To generate show notes, use the web application at http://localhost:4321
Run 'bun up' to start the development server or 'bun start' for production.
`)
  process.exit(0)
}
