# Docker Commands

The CLI exposes five Docker-focused subcommands under `bun as docker`: `up`, `prune`, `info`, `report`, and `logs`.

## Compose Inputs

- Compose file: `.github/docker-compose.yml`
- Dockerfile: `.github/Dockerfile`
- Environment file: `.env`
- Host port: `AUTOSHOW_DOCKER_HOST_PORT`, default `4321`
- Primary log target after `up`: `autoshow`

## Prerequisites

`docker up`, `docker info`, and `docker report` all rely on the stock Compose configuration. In the current implementation, your repo-root `.env` must satisfy the required `:?` variables in `.github/docker-compose.yml`.

That required set currently includes email, core provider keys, and S3 settings. Check `.github/docker-compose.yml` for the exact current list before assuming Docker can boot with a partial `.env`.

## `bun as docker up`

```bash
bun as docker up
```

This runs:

```bash
docker compose -f .github/docker-compose.yml --env-file .env up -d --build --wait
docker compose -f .github/docker-compose.yml --env-file .env logs -f --no-log-prefix autoshow
```

`Ctrl+C` stops the log tail, but it does not stop the Compose services.

If Compose reports the service as unhealthy during `--wait`, the CLI prints the last 200 `autoshow` log lines before exiting.

If host port `4321` is already in use and `AUTOSHOW_DOCKER_HOST_PORT` is not set, the CLI automatically picks the next free host port and prints the URL it selected.

## `bun as docker up prune`

```bash
bun as docker up prune
```

This runs the prune sequence first, then performs the normal `up` flow:

```bash
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker builder prune -af
docker network prune -f
docker image prune -af
docker volume prune -af
docker system prune -af --volumes
```

To pin Docker to a specific host port instead of auto-selecting one:

```bash
AUTOSHOW_DOCKER_HOST_PORT=4322 bun as docker up
AUTOSHOW_DOCKER_HOST_PORT=4322 bun as docker up prune
```

## `bun as docker prune`

```bash
bun as docker prune
```

This runs:

```bash
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker builder prune -af
docker network prune -f
docker image prune -af
docker volume prune -af
docker system prune -af --volumes
```

## `bun as docker info`

```bash
bun as docker info
```

This prints:

- `docker compose -f .github/docker-compose.yml ls`
- `docker compose -f .github/docker-compose.yml build --check`
- `docker compose -f .github/docker-compose.yml images`
- `docker compose -f .github/docker-compose.yml ps`
- `docker compose -f .github/docker-compose.yml volumes`
- `docker compose -f .github/docker-compose.yml top`

The `build --check` step is best-effort in the current implementation and does not abort the rest of the info output.

## `bun as docker logs [tail]`

```bash
bun as docker logs
bun as docker logs 200
```

This prints recent logs for the `autoshow` Compose service without following them. The optional `tail` argument defaults to `500`.

The command runs:

```bash
docker compose -f .github/docker-compose.yml --env-file .env logs --tail <tail> --no-log-prefix autoshow
```

## `bun as docker report [image-name]`

```bash
bun as docker report
bun as docker report autoshow:latest
```

The report command:

1. Ensures Docker Compose services are up.
2. Uses the provided image name when `docker image inspect <name>` succeeds.
3. Otherwise attempts automatic image detection.
4. Saves a markdown report to `docker-analysis-<timestamp>.md` in the current working directory.

The command also maintains image-size history in `~/.autoshow/docker-analysis-history.json`, which is used for the report's historical comparison section.

Because `docker report` calls `docker compose up -d` before the analysis pass, it has the same `.env` prerequisites as `docker up`.
