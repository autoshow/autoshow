# CLI Overview

Helper commands for managing the application, Docker containers, and build analysis.

## Outline

- [Main CLI Command](#main-cli-command)
- [Available Commands](#available-commands)
- [Help](#help)
- [Quick Start](#quick-start)
- [Repository Context](#repository-context)

## Main CLI Command

```bash
bun as [command]
```

## Available Commands

- `help` - Display help information
- `config` - Display environment configuration
- `stop` - Stop Docker Compose services
- `build` - Build Docker image
- `start` - Start Docker containers
- `logs` - Follow Docker container logs
- `prune` - Remove all Docker containers, images, volumes, and networks
- `info` - Show comprehensive Docker Compose information
- `docker-report` - Analyze Docker image size and composition
- `build-report` - Analyze SolidStart build for optimization
- `e2e` - Run end-to-end tests in isolated container
- `fetch-models` - Update model definitions from provider APIs

## Help

```bash
bun as help
bun as --help
bun as -h
```

## Quick Start

```bash
bun dev
```

Visit http://localhost:4321

For a containerized run:

```bash
bun up
```

## Repository Context

Generate repository context file with Repomix:

```bash
bun repo
```

Modify `INCLUDE_PATHS` and `IGNORE_PATHS` in `.github/repomix.sh` to customize output.
