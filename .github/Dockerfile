FROM oven/bun:alpine AS builder

ARG SKIP_FRONTEND_BUILD=false

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN if [ "$SKIP_FRONTEND_BUILD" = "true" ]; then \
      echo "Skipping frontend build (using cached .output)"; \
    else \
      bun run build; \
    fi

FROM oven/bun:alpine AS runtime

LABEL org.opencontainers.image.title="autoshow"
LABEL org.opencontainers.image.description="AI-powered video transcriptions and summaries"
LABEL org.opencontainers.image.version="1.0.0"

ENV NODE_ENV=production
ENV HOME=/root
ENV DATABASE_PATH=/data/autoshow.db
ENV HOST=0.0.0.0
ENV PORT=4321

RUN apk add --no-cache \
    curl \
    ffmpeg \
    aria2 \
    ca-certificates \
    bash \
    python3 \
    yt-dlp && \
    rm -rf /root/.cache/* /tmp/*

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/tests ./tests
COPY .github/start.sh /usr/local/bin/start.sh
COPY scripts ./scripts

RUN mkdir -p /data \
    /root/.autoshow \
    /app/output && \
    chmod +x /usr/local/bin/start.sh

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4321/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/start.sh"]