FROM oven/bun:1.3.7-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM oven/bun:1.3.7-alpine AS runtime

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
    yt-dlp && \
    rm -rf /root/.cache/* /tmp/* && \
    mkdir -p /home/appuser/.autoshow /app/output /app/uploads /app/data && \
    chown -R appuser:appgroup /home/appuser/.autoshow /app/output /app/uploads /app/data

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/tests ./tests
COPY --chmod=755 .github/start.sh /usr/local/bin/start.sh
COPY scripts ./scripts

USER appuser

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4321/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/start.sh"]
