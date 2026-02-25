# Docker Commands

Manage the Dockerized `autoshow` app service for autoshow-bun.

## Outline

- [Start Services](#start-services)
- [Stop Services](#stop-services)
- [Build Image](#build-image)
- [Start Containers](#start-containers)
- [Follow Logs](#follow-logs)
- [Prune Resources](#prune-resources)
- [Display Service Information](#display-service-information)
- [Docker Compose Files](#docker-compose-files)
- [Troubleshooting](#troubleshooting)
  - [Containers won't start](#containers-wont-start)
  - [Disk space issues](#disk-space-issues)
  - [Port conflicts](#port-conflicts)

## Start Services

```bash
bun up
```

Starts services using existing state (faster).

```bash
bun up prune
```

Prunes Docker resources then starts services (recommended for clean builds).

The `up` command will:
1. Build and start the Docker Compose app service
2. Follow the logs for the `autoshow` service

## Stop Services

```bash
bun as stop
```

Stops all Docker Compose services without removing containers.

## Build Image

```bash
bun as build
```

Builds the Docker image using cache.

```bash
bun as build --no-cache
```

Builds the Docker image without using cache (slower but ensures fresh build).

## Start Containers

```bash
bun as start
```

Starts existing Docker containers without rebuilding.

## Follow Logs

```bash
bun as logs
```

Follows logs from the `autoshow` service.

## Prune Resources

```bash
bun as prune
```

Removes all Docker containers, images, volumes, and networks. Use when:
- Experiencing build issues
- Need to free disk space
- Want completely fresh start

## Display Service Information

```bash
bun as info
```

Shows comprehensive Docker Compose information:
- Running services
- Container status
- Port mappings
- Volume mounts
- Network configuration

## Docker Compose Files

- `.github/docker-compose.yml` - Main service definitions
- `.github/Dockerfile` - Container build instructions

## Troubleshooting

### Containers won't start
```bash
bun up prune
```

### Disk space issues
```bash
bun as prune
docker system prune -a --volumes
```

### Port conflicts
Check if port 4321 is in use:
```bash
lsof -i :4321
```

### Environment variables not loading
Ensure `.env` exists at the repository root before running Docker Compose.
Docker Compose automatically reads this file for `${VAR}` interpolation.
