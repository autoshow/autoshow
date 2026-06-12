ARG BUN_BASE_IMAGE=oven/bun:1.3.14-alpine

FROM ${BUN_BASE_IMAGE} AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM ${BUN_BASE_IMAGE} AS runtime

LABEL org.opencontainers.image.title="autoshow-bun"
LABEL org.opencontainers.image.description="AI-powered video transcriptions and summaries"
LABEL org.opencontainers.image.version="1.0.0"

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    apk add --no-cache \
    curl \
    ffmpeg \
    aria2 \
    ca-certificates \
    bash \
    python3 \
    su-exec \
    yt-dlp && \
    rm -rf /root/.cache/* /tmp/* && \
    mkdir -p /home/appuser/.autoshow /app/artifacts/output /app/artifacts/uploads /app/artifacts/logs /app/artifacts/test-results /app/data && \
    chown -R appuser:appgroup /home/appuser/.autoshow /app/artifacts /app/data

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --chmod=755 .github/start.sh /usr/local/bin/start.sh

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4321/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/start.sh"]
